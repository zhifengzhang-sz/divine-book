/** Renders a parse tree (CST) as indented nodes. */

import { T } from "./theme.ts";

interface TreeNode {
	rule: string;
	text?: string;
	children?: (TreeNode | TreeNode[])[];
}

function Node({ node, depth = 0 }: { node: TreeNode | TreeNode[]; depth?: number }) {
	if (Array.isArray(node)) return <>{node.map((n, i) => <Node key={i} node={n} depth={depth} />)}</>;
	const pad = depth * 14;
	if (node.text && !node.children) {
		if (node.rule === "_" && node.text.length <= 1) return null;
		return (
			<div style={{ paddingLeft: pad, fontFamily: T.mono, fontSize: 11, lineHeight: 1.6 }}>
				<span style={{ color: T.muted }}>{node.rule}: </span>
				<span style={{ color: T.green }}>"{node.text}"</span>
			</div>
		);
	}
	return (
		<div>
			<div style={{ paddingLeft: pad, fontFamily: T.mono, fontSize: 11, lineHeight: 1.6 }}>
				<span style={{ color: T.blue, fontWeight: 600 }}>{node.rule}</span>
			</div>
			{node.children?.map((ch, i) => <Node key={i} node={ch as TreeNode} depth={depth + 1} />)}
		</div>
	);
}

export function ParseTreeView({ tree }: { tree: object }) {
	return <Node node={tree as TreeNode} />;
}
