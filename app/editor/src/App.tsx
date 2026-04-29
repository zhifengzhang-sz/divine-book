import { useEffect, useState, useCallback } from "react";
import { T, globalCSS } from "./theme.ts";
import { EditorShell, type EditorData } from "../../../lib/ui/editor/EditorShell.js";

export function App() {
	const [data, setData] = useState<EditorData | null>(null);
	const [dirty, setDirty] = useState(false);
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

	useEffect(() => {
		fetch("/api/data")
			.then((r) => r.json())
			.then((d: EditorData) => setData(d));
	}, []);

	const handleSave = useCallback(async () => {
		if (!data) return;
		setSaveStatus("saving");
		try {
			await fetch("/api/save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			await fetch("/api/gen-yaml");
			setDirty(false);
			setSaveStatus("saved");
			setTimeout(() => setSaveStatus("idle"), 2000);
		} catch (e) {
			console.error("Save failed:", e);
			setSaveStatus("idle");
		}
	}, [data]);

	function handleUpdate(updated: EditorData) {
		setData(updated);
		setDirty(true);
	}

	if (!data) {
		return (
			<div style={{ color: T.muted, fontFamily: T.heading, fontSize: 13, padding: 20 }}>
				<style>{globalCSS}</style>
				Loading...
			</div>
		);
	}

	return (
		<EditorShell
			data={data}
			onUpdate={handleUpdate}
			dirty={dirty}
			saveStatus={saveStatus}
			onSave={handleSave}
		/>
	);
}
