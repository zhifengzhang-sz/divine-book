#!/usr/bin/env bun
/**
 * Dev server for the combat visualization app.
 * Uses Bun's built-in bundler + HTTP server.
 *
 * Usage: bun app/viz/serve.ts
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

const port = Number(process.env.PORT ?? 3000);
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

/** Read a YAML file and return as JSON response. Fresh on every request. */
function serveYamlAsJson(yamlPath: string): Response {
	const raw = readFileSync(yamlPath, "utf-8");
	const data = parseYaml(raw);
	return new Response(JSON.stringify(data), { headers: JSON_HEADERS });
}

Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		if (path === "/" || path === "/index.html") {
			return new Response(Bun.file("app/viz/index.html"));
		}

		// API endpoints — serve YAML data as JSON (always fresh)
		if (path === "/api/books") return serveYamlAsJson("data/yaml/books.yaml");
		if (path === "/api/affixes")
			return serveYamlAsJson("data/yaml/affixes.yaml");

		// Bundle TSX/TS on the fly
		if (path.endsWith(".tsx") || path.endsWith(".ts")) {
			const filePath = `app/viz${path}`;
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
		const filePath = `app/viz${path}`;
		const file = Bun.file(filePath);
		if (await file.exists()) {
			return new Response(file);
		}

		return new Response("Not found", { status: 404 });
	},
});

console.log(`Viz server running at http://localhost:${port}`);
