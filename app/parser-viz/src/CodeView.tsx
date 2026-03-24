import { T } from "./theme.ts";
export function CodeView({ code }: { code: string }) {
	return <pre style={{ margin: 0, fontFamily: T.mono, fontSize: 10.5, lineHeight: 1.5, color: T.text, whiteSpace: "pre-wrap", background: "#0a0a08", borderRadius: T.r, padding: 6 }}>{code}</pre>;
}
