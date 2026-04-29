/**
 * Divine Book plugin for 道具数据库.
 *
 * Wraps EditorShell (the shared editor UI) into a plugin object.
 */

import { EditorShell, type EditorData } from "./editor/EditorShell.tsx";

export type { EditorData as DivineBookData };

interface PluginEditorProps {
	data: EditorData;
	onUpdate: (data: EditorData) => void;
}

function DivineBookEditor({ data, onUpdate }: PluginEditorProps) {
	return <EditorShell data={data} onUpdate={onUpdate} />;
}

export const divineBookPlugin = {
	id: "divine-book",
	name: "灵書",
	icon: "📖",
	description: "Skill books, affixes, and 通玄 data editor",
	Editor: DivineBookEditor,
};
