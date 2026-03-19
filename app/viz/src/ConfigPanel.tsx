import { useState } from "react";
import {
	combatConfig,
	manifest,
	type SimConfig,
} from "./runSim.ts";

// ── Manifest types ──────────────────────────────────────────────────

type ManifestBooks = Record<string, string[]>;
type ManifestAffixes = {
	universal: string[];
	school: Record<string, string[]>;
	exclusive: Record<string, string>;
};

const books = manifest.books as ManifestBooks;
const affixes = manifest.affixes as ManifestAffixes;

const allBookNames = Object.values(books).flat();
const firstBook = allBookNames[0] ?? "";
const secondBook = allBookNames[1] ?? firstBook;

const defaultStats = {
	hp: combatConfig.player.entity.hp,
	atk: combatConfig.player.entity.atk,
	sp: combatConfig.player.entity.sp,
	def: combatConfig.player.entity.def,
	spRegen: 100,
};

const defaults = {
	dr_constant: combatConfig.formulas.dr_constant,
	sp_shield_ratio: combatConfig.formulas.sp_shield_ratio,
	enlightenment: combatConfig.progression.enlightenment,
	fusion: combatConfig.progression.fusion,
	tGap: combatConfig.t_gap,
};

const schools = Object.keys(books);
const affixCategories = [
	"通用",
	...Object.keys(affixes.school),
	"专属",
] as const;

// ── Book Picker Dialog ──────────────────────────────────────────────

interface BookSelection {
	school: string;
	platform: string;
	enlightenment: number;
	fusion: number;
}

function BookPickerDialog({
	current,
	onConfirm,
	onCancel,
}: {
	current: BookSelection;
	onConfirm: (sel: BookSelection) => void;
	onCancel: () => void;
}) {
	const [sel, setSel] = useState<BookSelection>({ ...current });
	const schoolBooks = books[sel.school] ?? [];

	return (
		<div style={overlayStyle} onClick={onCancel}>
			<div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
				<div style={dialogTitleStyle}>Select Skill Book</div>

				<div style={{ marginBottom: 10 }}>
					<label style={labelStyle}>修为 (school)</label>
					<select
						value={sel.school}
						onChange={(e) => {
							const s = e.target.value;
							const sb = books[s] ?? [];
							setSel({ ...sel, school: s, platform: sb[0] ?? "" });
						}}
						style={selectStyle}
					>
						{schools.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</div>

				<div style={{ marginBottom: 10 }}>
					<label style={labelStyle}>功法書 (book)</label>
					<select
						value={sel.platform}
						onChange={(e) =>
							setSel({ ...sel, platform: e.target.value })
						}
						style={selectStyle}
					>
						{schoolBooks.map((b) => (
							<option key={b} value={b}>
								{b}
							</option>
						))}
					</select>
				</div>

				<div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
					<StatInput
						label="悟境"
						value={sel.enlightenment}
						onChange={(v) => setSel({ ...sel, enlightenment: v })}
						width={50}
					/>
					<StatInput
						label="融合"
						value={sel.fusion}
						onChange={(v) => setSel({ ...sel, fusion: v })}
						width={50}
					/>
				</div>

				<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
					<button type="button" onClick={onCancel} style={cancelBtnStyle}>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => onConfirm(sel)}
						style={confirmBtnStyle}
					>
						OK
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Affix Picker Dialog ─────────────────────────────────────────────

interface AffixSelection {
	category: string;
	name: string;
	enlightenment: number;
	fusion: number;
}

function getAffixesForCategory(
	category: string,
): { value: string; label: string }[] {
	if (category === "通用") {
		return affixes.universal.map((a) => ({ value: a, label: a }));
	}
	if (category === "专属") {
		return Object.entries(affixes.exclusive).map(([book, affix]) => ({
			value: affix,
			label: `${affix} (${book})`,
		}));
	}
	const schoolAffixes = affixes.school[category];
	if (schoolAffixes) {
		return schoolAffixes.map((a) => ({ value: a, label: a }));
	}
	return [];
}

function AffixPickerDialog({
	current,
	onConfirm,
	onCancel,
}: {
	current: AffixSelection;
	onConfirm: (sel: AffixSelection) => void;
	onCancel: () => void;
}) {
	const [sel, setSel] = useState<AffixSelection>({ ...current });
	const affixList = getAffixesForCategory(sel.category);

	return (
		<div style={overlayStyle} onClick={onCancel}>
			<div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
				<div style={dialogTitleStyle}>Select Affix</div>

				<div style={{ marginBottom: 10 }}>
					<label style={labelStyle}>类别 (category)</label>
					<select
						value={sel.category}
						onChange={(e) =>
							setSel({ category: e.target.value, name: "" })
						}
						style={selectStyle}
					>
						{affixCategories.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
				</div>

				<div style={{ marginBottom: 10 }}>
					<label style={labelStyle}>词缀 (affix)</label>
					<select
						value={sel.name}
						onChange={(e) =>
							setSel({ ...sel, name: e.target.value })
						}
						style={selectStyle}
					>
						<option value="">(none)</option>
						{affixList.map((a) => (
							<option key={a.value} value={a.value}>
								{a.label}
							</option>
						))}
					</select>
				</div>

				<div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
					<StatInput
						label="悟境"
						value={sel.enlightenment}
						onChange={(v) => setSel({ ...sel, enlightenment: v })}
						width={50}
					/>
					<StatInput
						label="融合"
						value={sel.fusion}
						onChange={(v) => setSel({ ...sel, fusion: v })}
						width={50}
					/>
				</div>

				<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
					<button type="button" onClick={onCancel} style={cancelBtnStyle}>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => onConfirm(sel)}
						style={confirmBtnStyle}
					>
						OK
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Player Panel ────────────────────────────────────────────────────

interface PlayerPanelState {
	school: string;
	platform: string;
	enlightenment: number;
	fusion: number;
	op1: string;
	op1Category: string;
	op1Enlightenment: number;
	op1Fusion: number;
	op2: string;
	op2Category: string;
	op2Enlightenment: number;
	op2Fusion: number;
	hp: number;
	atk: number;
	sp: number;
	def: number;
	spRegen: number;
}

/** Compact pill showing a selection with a change button */
function Pill({
	label,
	value,
	onClick,
}: {
	label: string;
	value: string;
	onClick: () => void;
}) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
			<span style={labelStyle}>{label}:</span>
			<button type="button" onClick={onClick} style={pillStyle}>
				{value || "(none)"}
			</button>
		</div>
	);
}

// ── PlayerBox: reusable component with book spec row + stats row ────

function PlayerBox({
	label,
	state,
	onChange,
	onOpenBookDialog,
	onOpenAffixDialog,
}: {
	label: string;
	state: PlayerPanelState;
	onChange: (s: PlayerPanelState) => void;
	onOpenBookDialog: () => void;
	onOpenAffixDialog: (slot: 1 | 2) => void;
}) {
	const set = (key: keyof PlayerPanelState, value: string | number) =>
		onChange({ ...state, [key]: value });

	const bookLabel = `${state.platform} (悟${state.enlightenment}/融${state.fusion})`;

	return (
		<div style={panelStyle}>
			<div style={{ color: "#e5c07b", fontWeight: "bold", marginBottom: 8 }}>
				{label}
			</div>

			{/* Row 1: Book + Affixes */}
			<div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
				<Pill label="Book" value={bookLabel} onClick={onOpenBookDialog} />
				<Pill
					label="词缀1"
					value={
						state.op1
							? `${state.op1} (悟${state.op1Enlightenment}/融${state.op1Fusion})`
							: ""
					}
					onClick={() => onOpenAffixDialog(1)}
				/>
				<Pill
					label="词缀2"
					value={
						state.op2
							? `${state.op2} (悟${state.op2Enlightenment}/融${state.op2Fusion})`
							: ""
					}
					onClick={() => onOpenAffixDialog(2)}
				/>
			</div>

			{/* Row 2: Stats */}
			<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
				<StatInput
					label="HP"
					value={state.hp}
					onChange={(v) => set("hp", v)}
					width={70}
				/>
				<StatInput
					label="ATK"
					value={state.atk}
					onChange={(v) => set("atk", v)}
					width={70}
				/>
				<StatInput
					label="SP"
					value={state.sp}
					onChange={(v) => set("sp", v)}
					width={70}
				/>
				<StatInput
					label="DEF"
					value={state.def}
					onChange={(v) => set("def", v)}
					width={70}
				/>
			</div>
		</div>
	);
}

// ── PlayerConfigPanel: wraps PlayerBox + manages dialogs ────────────

function PlayerConfigPanel({
	label,
	state,
	onChange,
}: {
	label: string;
	state: PlayerPanelState;
	onChange: (s: PlayerPanelState) => void;
}) {
	const [bookDialog, setBookDialog] = useState(false);
	const [affixDialog, setAffixDialog] = useState<1 | 2 | null>(null);

	return (
		<>
			<PlayerBox
				label={label}
				state={state}
				onChange={onChange}
				onOpenBookDialog={() => setBookDialog(true)}
				onOpenAffixDialog={setAffixDialog}
			/>

			{bookDialog && (
				<BookPickerDialog
					current={{
						school: state.school,
						platform: state.platform,
						enlightenment: state.enlightenment,
						fusion: state.fusion,
					}}
					onConfirm={(sel) => {
						onChange({
							...state,
							school: sel.school,
							platform: sel.platform,
							enlightenment: sel.enlightenment,
							fusion: sel.fusion,
						});
						setBookDialog(false);
					}}
					onCancel={() => setBookDialog(false)}
				/>
			)}

			{affixDialog !== null && (
				<AffixPickerDialog
					current={{
						category:
							affixDialog === 1 ? state.op1Category : state.op2Category,
						name: affixDialog === 1 ? state.op1 : state.op2,
						enlightenment:
							affixDialog === 1
								? state.op1Enlightenment
								: state.op2Enlightenment,
						fusion:
							affixDialog === 1 ? state.op1Fusion : state.op2Fusion,
					}}
					onConfirm={(sel) => {
						if (affixDialog === 1) {
							onChange({
								...state,
								op1Category: sel.category,
								op1: sel.name,
								op1Enlightenment: sel.enlightenment,
								op1Fusion: sel.fusion,
							});
						} else {
							onChange({
								...state,
								op2Category: sel.category,
								op2: sel.name,
								op2Enlightenment: sel.enlightenment,
								op2Fusion: sel.fusion,
							});
						}
						setAffixDialog(null);
					}}
					onCancel={() => setAffixDialog(null)}
				/>
			)}
		</>
	);
}

// ── Main ConfigPanel ────────────────────────────────────────────────

interface ConfigPanelProps {
	onRun: (config: SimConfig) => void;
}

export function ConfigPanel({ onRun }: ConfigPanelProps) {
	const [playerA, setPlayerA] = useState<PlayerPanelState>({
		school: schools[0],
		platform: firstBook,
		enlightenment: defaults.enlightenment,
		fusion: defaults.fusion,
		op1: "",
		op1Category: "通用",
		op1Enlightenment: defaults.enlightenment,
		op1Fusion: defaults.fusion,
		op2: "",
		op2Category: "通用",
		op2Enlightenment: defaults.enlightenment,
		op2Fusion: defaults.fusion,
		...defaultStats,
	});
	const [playerB, setPlayerB] = useState<PlayerPanelState>({
		school: schools[0],
		platform: secondBook,
		enlightenment: defaults.enlightenment,
		fusion: defaults.fusion,
		op1: "",
		op1Category: "通用",
		op1Enlightenment: defaults.enlightenment,
		op1Fusion: defaults.fusion,
		op2: "",
		op2Category: "通用",
		op2Enlightenment: defaults.enlightenment,
		op2Fusion: defaults.fusion,
		...defaultStats,
	});
	const [seed, setSeed] = useState(42);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [drConstant, setDrConstant] = useState(defaults.dr_constant);
	const [spShieldRatio, setSpShieldRatio] = useState(defaults.sp_shield_ratio);

	const handleRun = () => {
		onRun({
			playerA: {
				platform: playerA.platform,
				op1: playerA.op1,
				op2: playerA.op2,
				stats: {
					hp: playerA.hp,
					atk: playerA.atk,
					sp: playerA.sp,
					def: playerA.def,
					spRegen: playerA.spRegen,
				},
				progression: {
					enlightenment: playerA.enlightenment,
					fusion: playerA.fusion,
				},
				op1Progression: {
					enlightenment: playerA.op1Enlightenment,
					fusion: playerA.op1Fusion,
				},
				op2Progression: {
					enlightenment: playerA.op2Enlightenment,
					fusion: playerA.op2Fusion,
				},
			},
			playerB: {
				platform: playerB.platform,
				op1: playerB.op1,
				op2: playerB.op2,
				stats: {
					hp: playerB.hp,
					atk: playerB.atk,
					sp: playerB.sp,
					def: playerB.def,
					spRegen: playerB.spRegen,
				},
				progression: {
					enlightenment: playerB.enlightenment,
					fusion: playerB.fusion,
				},
				op1Progression: {
					enlightenment: playerB.op1Enlightenment,
					fusion: playerB.op1Fusion,
				},
				op2Progression: {
					enlightenment: playerB.op2Enlightenment,
					fusion: playerB.op2Fusion,
				},
			},
			formulas: {
				dr_constant: drConstant,
				sp_shield_ratio: spShieldRatio,
			},
			tGap: defaults.tGap,
			seed,
		});
	};

	return (
		<div style={{ marginBottom: 16 }}>
			<div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
				<PlayerConfigPanel
					label="Player A"
					state={playerA}
					onChange={setPlayerA}
				/>
				<PlayerConfigPanel
					label="Player B"
					state={playerB}
					onChange={setPlayerB}
				/>
			</div>

			<div
				style={{
					display: "flex",
					gap: 12,
					alignItems: "center",
					flexWrap: "wrap",
				}}
			>
				<StatInput label="Seed" value={seed} onChange={setSeed} width={60} />
				<button type="button" onClick={handleRun} style={runBtnStyle}>
					Run Simulation
				</button>
				<button
					type="button"
					onClick={() => setShowAdvanced(!showAdvanced)}
					style={linkStyle}
				>
					{showAdvanced ? "▾ Less" : "▸ More"}
				</button>
			</div>

			{showAdvanced && (
				<div
					style={{
						display: "flex",
						gap: 12,
						marginTop: 8,
						alignItems: "center",
						flexWrap: "wrap",
					}}
				>
					<StatInput
						label="DR Constant"
						value={drConstant}
						onChange={setDrConstant}
					/>
					<StatInput
						label="SP→Shield"
						value={spShieldRatio}
						onChange={setSpShieldRatio}
						width={50}
					/>
				</div>
			)}
		</div>
	);
}

// ── Shared Components ───────────────────────────────────────────────

function StatInput({
	label,
	value,
	onChange,
	width = 90,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	width?: number;
}) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
			<label style={labelStyle}>{label}:</label>
			<input
				type="text"
				value={value}
				onChange={(e) => {
					const n = Number(e.target.value);
					if (!Number.isNaN(n)) onChange(n);
				}}
				style={{ ...inputStyle, width }}
			/>
		</div>
	);
}

// ── Styles ──────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
	fontSize: 11,
	color: "#5c6370",
};
const selectStyle: React.CSSProperties = {
	display: "block",
	width: "100%",
	background: "#1e2127",
	color: "#abb2bf",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "4px 6px",
	fontSize: 13,
	fontFamily: "inherit",
};
const inputStyle: React.CSSProperties = {
	background: "#1e2127",
	color: "#abb2bf",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "4px 6px",
	fontSize: 12,
	fontFamily: "inherit",
};
const panelStyle: React.CSSProperties = {
	flex: 1,
	padding: 12,
	background: "#282c34",
	borderRadius: 8,
	border: "1px solid #4b5263",
};
const pillStyle: React.CSSProperties = {
	background: "#1e2127",
	color: "#abb2bf",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "3px 8px",
	fontSize: 12,
	fontFamily: "inherit",
	cursor: "pointer",
	textAlign: "left",
};
const overlayStyle: React.CSSProperties = {
	position: "fixed",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	background: "rgba(0,0,0,0.6)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	zIndex: 100,
};
const dialogStyle: React.CSSProperties = {
	background: "#21252b",
	border: "1px solid #4b5263",
	borderRadius: 8,
	padding: 20,
	minWidth: 320,
	maxWidth: 400,
};
const dialogTitleStyle: React.CSSProperties = {
	color: "#e5c07b",
	fontWeight: "bold",
	fontSize: 14,
	marginBottom: 12,
};
const runBtnStyle: React.CSSProperties = {
	background: "#61afef",
	color: "#282c34",
	border: "none",
	borderRadius: 4,
	padding: "6px 16px",
	cursor: "pointer",
	fontSize: 13,
	fontWeight: "bold",
	fontFamily: "inherit",
};
const cancelBtnStyle: React.CSSProperties = {
	background: "none",
	color: "#5c6370",
	border: "1px solid #4b5263",
	borderRadius: 4,
	padding: "4px 12px",
	cursor: "pointer",
	fontSize: 12,
	fontFamily: "inherit",
};
const confirmBtnStyle: React.CSSProperties = {
	background: "#61afef",
	color: "#282c34",
	border: "none",
	borderRadius: 4,
	padding: "4px 12px",
	cursor: "pointer",
	fontSize: 12,
	fontWeight: "bold",
	fontFamily: "inherit",
};
const linkStyle: React.CSSProperties = {
	background: "none",
	border: "none",
	color: "#5c6370",
	cursor: "pointer",
	fontSize: 12,
	fontFamily: "inherit",
	padding: 0,
};
