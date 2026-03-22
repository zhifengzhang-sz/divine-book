#!/usr/bin/env bun
/**
 * Dev server for the parser pipeline visualizer.
 * Serves the React app + API endpoints for raw source data.
 *
 * Usage: bun app/parser-viz/serve.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createActor } from "xstate";
import {
	type AffixEntry,
	readSchoolAffixTable,
	readUniversalAffixTable,
} from "../../lib/parser/common-affixes.js";
import {
	type ExclusiveAffixEntry,
	readExclusiveAffixTable,
} from "../../lib/parser/exclusive.js";
import { readMainSkillTables, splitCell } from "../../lib/parser/md-table.js";
import { runPipeline, type SourceType } from "../../lib/parser/pipeline.js";
import {
	type PipelineEmitted,
	pipelineMachine,
} from "../../lib/parser/reactive.js";

const port = Number(process.env.PORT ?? 3001);

// ── Load raw markdown data at startup ────────────────────

const mainMd = readFileSync(resolve("data/raw/主书.md"), "utf-8");
const exclusiveMd = readFileSync(resolve("data/raw/专属词缀.md"), "utf-8");
const schoolMd = readFileSync(resolve("data/raw/修为词缀.md"), "utf-8");
const universalMd = readFileSync(resolve("data/raw/通用词缀.md"), "utf-8");

// Parse into structured entries
const bookEntries = readMainSkillTables(mainMd);
const exclusiveEntries = readExclusiveAffixTable(exclusiveMd);
const schoolEntries = readSchoolAffixTable(schoolMd);
const universalEntries = readUniversalAffixTable(universalMd);

// Pre-build API responses
const booksResponse = JSON.stringify({
	entries: bookEntries.map((e) => ({
		name: e.name,
		school: e.school,
		skillText: e.skillText.replace(/<br\s*\/?>/gi, "\n"),
		affixText: e.affixText.replace(/<br\s*\/?>/gi, "\n"),
	})),
});

const exclusiveResponse = JSON.stringify({
	entries: exclusiveEntries.map((e: ExclusiveAffixEntry) => ({
		bookName: e.bookName,
		school: e.school,
		affixName: e.affixName,
		rawText: e.rawText,
	})),
});

const schoolResponse = JSON.stringify({
	entries: schoolEntries.map((e: AffixEntry) => ({
		name: e.name,
		school: e.school,
		rawText: e.rawText,
	})),
});

const universalResponse = JSON.stringify({
	entries: universalEntries.map((e: AffixEntry) => ({
		name: e.name,
		rawText: e.rawText,
	})),
});

// ── Server ───────────────────────────────────────────────

Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		// Parse API — runs pipeline server-side + XState events
		if (path === "/api/parse" && req.method === "POST") {
			try {
				const body = (await req.json()) as {
					sourceType: SourceType;
					text: string;
					bookName?: string;
				};
				const result = runPipeline(body.sourceType, body.text, body.bookName);

				// Also run XState machine to collect emitted events
				const cell = splitCell(body.text.replace(/\n/g, "<br>"));
				const joinedDesc = cell.description.join("，");
				const cleanText =
					body.sourceType === "skill"
						? joinedDesc
						: joinedDesc.replace(/^【.+?】[：:]/, "");

				const emitted: PipelineEmitted[] = [];
				const actor = createActor(pipelineMachine, {
					input: {
						text: cleanText,
						sourceType: body.sourceType === "skill" ? "skill" : "affix",
						bookName: body.bookName,
					},
				});
				actor.on("*", (ev: unknown) => {
					emitted.push(ev as PipelineEmitted);
				});
				actor.start();
				actor.send({ type: "PARSE" });
				actor.stop();

				return new Response(JSON.stringify({ ...result, xstate: emitted }), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (e) {
				return new Response(JSON.stringify({ error: (e as Error).message }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
		}

		// Source data endpoints
		if (path === "/api/sources/books") {
			return new Response(booksResponse, {
				headers: { "Content-Type": "application/json" },
			});
		}
		if (path === "/api/sources/exclusive") {
			return new Response(exclusiveResponse, {
				headers: { "Content-Type": "application/json" },
			});
		}
		if (path === "/api/sources/school") {
			return new Response(schoolResponse, {
				headers: { "Content-Type": "application/json" },
			});
		}
		if (path === "/api/sources/universal") {
			return new Response(universalResponse, {
				headers: { "Content-Type": "application/json" },
			});
		}

		// HTML
		if (path === "/" || path === "/index.html") {
			return new Response(Bun.file("app/parser-viz/index.html"));
		}

		// Bundle TSX/TS on the fly
		if (path.endsWith(".tsx") || path.endsWith(".ts")) {
			const filePath = `app/parser-viz${path}`;
			try {
				const result = await Bun.build({
					entrypoints: [filePath],
					format: "esm",
					target: "browser",
					minify: false,
				});
				if (result.success && result.outputs.length > 0) {
					const code = await result.outputs[0].text();
					return new Response(code, {
						headers: { "Content-Type": "application/javascript" },
					});
				}
				return new Response(`Build error: ${result.logs.join("\n")}`, {
					status: 500,
				});
			} catch (e) {
				return new Response(`Build error: ${(e as Error).message}`, {
					status: 500,
				});
			}
		}

		// Static files
		const filePath = `app/parser-viz${path}`;
		const file = Bun.file(filePath);
		if (await file.exists()) {
			return new Response(file);
		}

		return new Response("Not found", { status: 404 });
	},
});

console.log(`Parser-viz server running at http://localhost:${port}`);
