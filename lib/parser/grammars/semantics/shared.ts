/**
 * Shared semantic helpers — used by all 34 semantic files.
 */

import type * as ohm from "ohm-js";

const CN: Record<string, number> = {
	一: 1,
	二: 2,
	两: 2,
	三: 3,
	四: 4,
	五: 5,
	六: 6,
	七: 7,
	八: 8,
	九: 9,
	十: 10,
};

export function parseCn(s: string): number {
	return CN[s] ?? (Number.parseInt(s, 10) || 1);
}

/**
 * Register the extractVar attribute on a semantics object.
 * Memoized — returns the variable string from varRef, stateName, cnNumber nodes.
 * Identical across all books and affixes.
 */
export function addExtractVar(s: ohm.Semantics): void {
	s.addAttribute("extractVar", {
		varRef_letters(_c: ohm.Node) {
			return this.sourceString;
		},
		varRef_decimal(_i: ohm.Node, _d: ohm.Node, _f: ohm.Node) {
			return this.sourceString;
		},
		varRef_integer(_d: ohm.Node) {
			return this.sourceString;
		},
		stateName(_o: ohm.Node, c: ohm.Node, _cl: ohm.Node) {
			return c.sourceString;
		},
		stateNameChars(_c: ohm.Node) {
			return this.sourceString;
		},
		digits(_d: ohm.Node) {
			return this.sourceString;
		},
		cnNumber(_d: ohm.Node) {
			return String(parseCn(this.sourceString));
		},
		cnNumberOrDigit(_child: ohm.Node) {
			return _child.extractVar;
		},
		_nonterminal(...children: ohm.Node[]) {
			// Multi-child rules: find the varRef or stateName child.
			// Skip terminal nodes (they return raw text like "为自身添加").
			// Only non-terminal children (varRef, stateName, cnNumber) are meaningful.
			for (const child of children) {
				if (child.ctorName === "_terminal" || child.ctorName === "_iter") continue;
				try {
					const val = child.extractVar;
					if (val && val !== this.sourceString) return val;
				} catch {
					// no extractVar on this child
				}
			}
			return this.sourceString;
		},
		_terminal() {
			return this.sourceString;
		},
		_iter(...children: ohm.Node[]) {
			return children.length > 0
				? children[children.length - 1].extractVar
				: this.sourceString;
		},
	});
}
