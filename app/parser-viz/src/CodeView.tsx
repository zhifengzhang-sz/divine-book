/** Renders source code in a pre block. */

import { T } from "./theme.ts";

export function CodeView({ code }: { code: string }) {
	return (
		<pre style={{
			margin: 0, fontFamily: T.mono, fontSize: 11,
			lineHeight: 1.5, color: T.text, whiteSpace: "pre-wrap",
		}}>
			{code}
		</pre>
	);
}
