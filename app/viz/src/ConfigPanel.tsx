import { useState } from "react";
import {
	combatConfig,
	manifest,
	type PlayerBookConfig,
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

// ── Sub-components ──────────────────────────────────────────────────

interface ConfigPanelProps {
	onRun: (config: SimConfig) => void;
}

const schools = Object.keys(books);
const affixCategories = ["通用", ...Object.keys(affixes.school), "专属"] as const;

interface PlayerPanelState {
	school: string;
	platform: string;
	op1: string;
	op2: string;
	op1Category: string;
	op2Category: string;
	hp: number;
	atk: number;
	sp: number;
	def: number;
	spRegen: number;
	enlightenment: number;
	fusion: number;
}

/** Get affix list for a given category */
function getAffixesForCategory(category: string): { value: string; label: string }[] {
	if (category === "通用") {
		return affixes.universal.map((a) => ({ value: a, label: a }));
	}
	if (category === "专属") {
		return Object.entries(affixes.exclusive).map(([book, affix]) => ({
			value: affix,
			label: `${affix} (${book})`,
		}));
	}
	// School affix
	const schoolAffixes = affixes.school[category];
	if (schoolAffixes) {
		return schoolAffixes.map((a) => ({ value: a, label: a }));
	}
	return [];
}

function PlayerConfigPanel({
	label,
	state,
	onChange,
}: {
	label: string;
	state: PlayerPanelState;
	onChange: (s: PlayerPanelState) => void;
}) {
	const set = (key: keyof PlayerPanelState, value: string | number) =>
		onChange({ ...state, [key]: value });

	const schoolBooks = books[state.school] ?? [];
	const op1Affixes = getAffixesForCategory(state.op1Category);
	const op2Affixes = getAffixesForCategory(state.op2Category);

	return (
		<div
			style={{
				flex: 1,
				padding: 12,
				background: "#282c34",
				borderRadius: 8,
				border: "1px solid #4b5263",
			}}
		>
			<div
				style={{ color: "#e5c07b", fontWeight: "bold", marginBottom: 8 }}
			>
				{label}
			</div>

			{/* School → Book chained selectors */}
			<div style={{ marginBottom: 6 }}>
				<label style={labelStyle}>修为 (school)</label>
				<select
					value={state.school}
					onChange={(e) => {
						const newSchool = e.target.value;
						const newBooks = books[newSchool] ?? [];
						onChange({ ...state, school: newSchool, platform: newBooks[0] ?? "" });
					}}
					style={selectStyle}
				>
					{schools.map((s) => (
						<option key={s} value={s}>{s}</option>
					))}
				</select>
			</div>
			<div style={{ marginBottom: 6 }}>
				<label style={labelStyle}>功法書 (skill book)</label>
				<select
					value={state.platform}
					onChange={(e) => set("platform", e.target.value)}
					style={selectStyle}
				>
					{schoolBooks.map((b) => (
						<option key={b} value={b}>{b}</option>
					))}
				</select>
			</div>

			{/* Affix category → Affix chained selectors */}
			<div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
				<div style={{ flex: "0 0 80px" }}>
					<label style={labelStyle}>词缀1 类别</label>
					<select
						value={state.op1Category}
						onChange={(e) => onChange({ ...state, op1Category: e.target.value, op1: "" })}
						style={selectStyle}
					>
						{affixCategories.map((c) => (
							<option key={c} value={c}>{c}</option>
						))}
					</select>
				</div>
				<div style={{ flex: 1 }}>
					<label style={labelStyle}>词缀1</label>
					<select
						value={state.op1}
						onChange={(e) => set("op1", e.target.value)}
						style={selectStyle}
					>
						<option value="">(none)</option>
						{op1Affixes.map((a) => (
							<option key={a.value} value={a.value}>{a.label}</option>
						))}
					</select>
				</div>
			</div>
			<div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
				<div style={{ flex: "0 0 80px" }}>
					<label style={labelStyle}>词缀2 类别</label>
					<select
						value={state.op2Category}
						onChange={(e) => onChange({ ...state, op2Category: e.target.value, op2: "" })}
						style={selectStyle}
					>
						{affixCategories.map((c) => (
							<option key={c} value={c}>{c}</option>
						))}
					</select>
				</div>
				<div style={{ flex: 1 }}>
					<label style={labelStyle}>词缀2</label>
					<select
						value={state.op2}
						onChange={(e) => set("op2", e.target.value)}
						style={selectStyle}
					>
						<option value="">(none)</option>
						{op2Affixes.map((a) => (
							<option key={a.value} value={a.value}>{a.label}</option>
						))}
					</select>
				</div>
			</div>

			{/* Per-player stats */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "4px 12px",
				}}
			>
				<StatInput
					label="HP"
					value={state.hp}
					onChange={(v) => set("hp", v)}
				/>
				<StatInput
					label="ATK"
					value={state.atk}
					onChange={(v) => set("atk", v)}
				/>
				<StatInput
					label="SP"
					value={state.sp}
					onChange={(v) => set("sp", v)}
				/>
				<StatInput
					label="DEF"
					value={state.def}
					onChange={(v) => set("def", v)}
				/>
				<StatInput
					label="悟境"
					value={state.enlightenment}
					onChange={(v) => set("enlightenment", v)}
					width={40}
				/>
				<StatInput
					label="融合"
					value={state.fusion}
					onChange={(v) => set("fusion", v)}
					width={50}
				/>
			</div>
		</div>
	);
}

// ── Main ConfigPanel ────────────────────────────────────────────────

export function ConfigPanel({ onRun }: ConfigPanelProps) {
	const [playerA, setPlayerA] = useState<PlayerPanelState>({
		school: schools[0],
		platform: firstBook,
		op1: "",
		op2: "",
		op1Category: "通用",
		op2Category: "通用",
		...defaultStats,
		enlightenment: defaults.enlightenment,
		fusion: defaults.fusion,
	});
	const [playerB, setPlayerB] = useState<PlayerPanelState>({
		school: schools[0],
		platform: secondBook,
		op1: "",
		op2: "",
		op1Category: "通用",
		op2Category: "通用",
		...defaultStats,
		enlightenment: defaults.enlightenment,
		fusion: defaults.fusion,
	});
	const [seed, setSeed] = useState(42);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [drConstant, setDrConstant] = useState(defaults.dr_constant);
	const [spShieldRatio, setSpShieldRatio] = useState(
		defaults.sp_shield_ratio,
	);

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
			{/* Player panels side by side */}
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

			{/* Shared controls */}
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

// ── Helpers ─────────────────────────────────────────────────────────

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
const linkStyle: React.CSSProperties = {
	background: "none",
	border: "none",
	color: "#5c6370",
	cursor: "pointer",
	fontSize: 12,
	fontFamily: "inherit",
	padding: 0,
};
