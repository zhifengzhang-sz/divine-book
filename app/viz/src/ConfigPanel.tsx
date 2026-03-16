import { useState } from "react";
import {
	combatConfig,
	manifest,
	type PlayerBookConfig,
	type SimConfig,
} from "./runSim.ts";

const allAffixes = [
	"(none)",
	...manifest.affixes.universal,
	...Object.values(manifest.affixes.school).flat(),
];

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

interface ConfigPanelProps {
	onRun: (config: SimConfig) => void;
}

interface PlayerPanelState {
	platform: string;
	op1: string;
	op2: string;
	hp: number;
	atk: number;
	sp: number;
	def: number;
	spRegen: number;
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

			{/* Book selectors */}
			<div style={{ marginBottom: 6 }}>
				<label style={labelStyle}>Platform (main book)</label>
				<select
					value={state.platform}
					onChange={(e) => set("platform", e.target.value)}
					style={selectStyle}
				>
					{manifest.books.map((b) => (
						<option key={b} value={b}>
							{b}
						</option>
					))}
				</select>
			</div>
			<div style={{ marginBottom: 6 }}>
				<label style={labelStyle}>Aux Affix 1</label>
				<select
					value={state.op1}
					onChange={(e) => set("op1", e.target.value)}
					style={selectStyle}
				>
					{allAffixes.map((a) => (
						<option key={a} value={a === "(none)" ? "" : a}>
							{a}
						</option>
					))}
				</select>
			</div>
			<div style={{ marginBottom: 8 }}>
				<label style={labelStyle}>Aux Affix 2</label>
				<select
					value={state.op2}
					onChange={(e) => set("op2", e.target.value)}
					style={selectStyle}
				>
					{allAffixes.map((a) => (
						<option key={a} value={a === "(none)" ? "" : a}>
							{a}
						</option>
					))}
				</select>
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
			</div>
		</div>
	);
}

export function ConfigPanel({ onRun }: ConfigPanelProps) {
	const [playerA, setPlayerA] = useState<PlayerPanelState>({
		platform: manifest.books[0] ?? "",
		op1: "",
		op2: "",
		...defaultStats,
	});
	const [playerB, setPlayerB] = useState<PlayerPanelState>({
		platform: manifest.books[1] ?? manifest.books[0] ?? "",
		op1: "",
		op2: "",
		...defaultStats,
	});
	const [seed, setSeed] = useState(42);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [drConstant, setDrConstant] = useState(defaults.dr_constant);
	const [spShieldRatio, setSpShieldRatio] = useState(
		defaults.sp_shield_ratio,
	);
	const [enlightenment, setEnlightenment] = useState(defaults.enlightenment);
	const [fusion, setFusion] = useState(defaults.fusion);

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
			},
			formulas: {
				dr_constant: drConstant,
				sp_shield_ratio: spShieldRatio,
			},
			progression: { enlightenment, fusion },
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
					<StatInput
						label="悟境"
						value={enlightenment}
						onChange={setEnlightenment}
						width={40}
					/>
					<StatInput
						label="融合"
						value={fusion}
						onChange={setFusion}
						width={50}
					/>
				</div>
			)}
		</div>
	);
}

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
