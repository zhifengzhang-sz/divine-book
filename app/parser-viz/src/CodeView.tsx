import { T } from "./theme.ts";

export function CodeView({ code }: { code: string }) {
	return (
		<pre style={{
			margin: 0, fontFamily: T.mono, fontSize: 10.5,
			lineHeight: 1.5, color: T.text, whiteSpace: "pre-wrap",
			background: "#0c0c0c", borderRadius: T.radius, padding: 8,
		}}>
			{code}
		</pre>
	);
}
