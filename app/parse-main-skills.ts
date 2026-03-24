#!/usr/bin/env bun
/**
 * CLI: Parse main skills + exclusive affixes → books.yaml
 *
 * Usage:
 *   bun app/parse-main-skills.ts                    # write to stdout
 *   bun app/parse-main-skills.ts -o data/yaml/books.yaml  # write to file
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseMainSkillsToYaml } from "../lib/parser/index.js";

const { values } = parseArgs({
	options: {
		output: { type: "string", short: "o" },
	},
});

const mainMd = readFileSync(resolve("data/raw/主书.md"), "utf-8");
const exclusiveMd = readFileSync(resolve("data/raw/专属词缀.md"), "utf-8");

const yaml = await parseMainSkillsToYaml(mainMd, exclusiveMd);

if (values.output) {
	writeFileSync(values.output, yaml);
	console.log(`Written to ${values.output}`);
} else {
	console.log(yaml);
}
