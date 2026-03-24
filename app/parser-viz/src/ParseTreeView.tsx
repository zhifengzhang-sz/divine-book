import { T } from "./theme.ts";

// Tree uses short keys from server: r=rule, t=text, c=children
interface N { r: string; t?: string; c?: (N | N[])[] }

function Node({ n, d = 0 }: { n: N | N[]; d?: number }) {
	if (Array.isArray(n)) return <>{n.map((x, i) => <Node key={i} n={x} d={d} />)}</>;
	if (n.t && !n.c) {
		if (n.r === "_" && n.t.length <= 1) return null;
		return (
			<div style={{ paddingLeft: d * 12, fontFamily: T.mono, fontSize: 10.5, lineHeight: 1.5 }}>
				<span style={{ color: T.muted }}>{n.r !== "_" ? `${n.r}: ` : ""}</span>
				<span style={{ color: T.green }}>"{n.t}"</span>
			</div>
		);
	}
	return (
		<div>
			<div style={{ paddingLeft: d * 12, fontFamily: T.mono, fontSize: 10.5, lineHeight: 1.5 }}>
				<span style={{ color: T.blue }}>{n.r}</span>
			</div>
			{n.c?.map((ch, i) => <Node key={i} n={ch as N} d={d + 1} />)}
		</div>
	);
}

export function ParseTreeView({ tree }: { tree: object }) {
	return <Node n={tree as N} />;
}
