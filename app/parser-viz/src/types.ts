/**
 * Client-side types for the per-book grammar pipeline visualizer.
 */

export interface BookEntry {
	name: string;
	school: string;
	skillText: string;
	affixText: string;
}

export interface ParseTreeNode {
	rule: string;
	text?: string;
	children?: (ParseTreeNode | ParseTreeNode[])[];
}

export type EffectRow = { type: string; [k: string]: unknown };

export interface ParseResponse {
	bookName: string;
	entryPoint: string;
	rawText: string;
	ohmSource: string;
	semanticsSource: string;
	parseSucceeded: boolean;
	parseError?: string;
	parseTree?: ParseTreeNode;
	effects?: EffectRow[];
	effectError?: string;
}
