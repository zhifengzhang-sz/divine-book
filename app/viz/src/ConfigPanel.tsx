import { useState } from "react";
import { combatConfig, manifest, type SimConfig } from "./runSim.ts";

const allAffixes = [
	"(none)",
	...manifest.affixes.universal,
	...Object.values(manifest.affixes.school).flat(),
];

const defaults = {
	hp: combatConfig.player.entity.hp,
	atk: combatConfig.player.entity.atk,
	sp: combatConfig.player.entity.sp,
	def: combatConfig.player.entity.def,
	spRegen: 100,
	dr_constant: combatConfig.formulas.dr_constant,
	sp_shield_ratio: combatConfig.formulas.sp_shield_ratio,
	enlightenment: combatConfig.progression.enlightenment,
	fusion: combatConfig.progression.fusion,
	tGap: combatConfig.t_gap,
};

interface ConfigPanelProps {
	onRun: (config: SimConfig) => void;
}

function BookSelector({
	label,
	platform,
	op1,
	op2,
	onPlatform,
	onOp1,
	onOp2,
}: {
	label: string;
	platform: string;
	op1: string;
	op2: string;
	onPlatform: (v: string) => void;
	onOp1: (v: string) => void;
	onOp2: (v: string) => void;
}) {
	return (
		<div style={{ flex: 1, padding: 12, background: "#282c34", borderRadius: 8, border: "1px solid #4b5263" }}>
			<div style={{ color: "#e5c07b", fontWeight: "bold", marginBottom: 8 }}>{label}</div>
			<div style={{ marginBottom: 6 }}>
				<label style={{ fontSize: 11, color: "#5c6370" }}>Platform (main book)</label>
				<select value={platform} onChange={(e) => onPlatform(e.target.value)} style={selectStyle}>
					{manifest.books.map((b) => <option key={b} value={b}>{b}</option>)}
				</select>
			</div>
			<div style={{ marginBottom: 6 }}>
				<label style={{ fontSize: 11, color: "#5c6370" }}>Aux Affix 1</label>
				<select value={op1} onChange={(e) => onOp1(e.target.value)} style={selectStyle}>
					{allAffixes.map((a) => <option key={a} value={a === "(none)" ? "" : a}>{a}</option>)}
				</select>
			</div>
			<div>
				<label style={{ fontSize: 11, color: "#5c6370" }}>Aux Affix 2</label>
				<select value={op2} onChange={(e) => onOp2(e.target.value)} style={selectStyle}>
					{allAffixes.map((a) => <option key={a} value={a === "(none)" ? "" : a}>{a}</option>)}
				</select>
			</div>
		</div>
	);
}

export function ConfigPanel({ onRun }: ConfigPanelProps) {
	const [pA, setPlatformA] = useState(manifest.books[0] ?? "");
	const [op1A, setOp1A] = useState("");
	const [op2A, setOp2A] = useState("");
	const [pB, setPlatformB] = useState(manifest.books[1] ?? manifest.books[0] ?? "");
	const [op1B, setOp1B] = useState("");
	const [op2B, setOp2B] = useState("");

	// Stats from config/combat.json
	const [hp, setHp] = useState(defaults.hp);
	const [atk, setAtk] = useState(defaults.atk);
	const [sp, setSp] = useState(defaults.sp);
	const [def, setDef] = useState(defaults.def);
	const [spRegen, setSpRegen] = useState(defaults.spRegen);
	const [seed, setSeed] = useState(42);

	// Formulas from config
	const [drConstant, setDrConstant] = useState(defaults.dr_constant);
	const [spShieldRatio, setSpShieldRatio] = useState(defaults.sp_shield_ratio);

	// Progression from config
	const [enlightenment, setEnlightenment] = useState(defaults.enlightenment);
	const [fusion, setFusion] = useState(defaults.fusion);

	const [showAdvanced, setShowAdvanced] = useState(false);

	const handleRun = () => {
		onRun({
			playerA: { platform: pA, op1: op1A, op2: op2A },
			playerB: { platform: pB, op1: op1B, op2: op2B },
			stats: { hp, atk, sp, def, spRegen },
			formulas: { dr_constant: drConstant, sp_shield_ratio: spShieldRatio },
			progression: { enlightenment, fusion },
			tGap: defaults.tGap,
			seed,
		});
	};

	return (
		<div style={{ marginBottom: 16 }}>
			{/* Book selectors */}
			<div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
				<BookSelector label="Player A" platform={pA} op1={op1A} op2={op2A} onPlatform={setPlatformA} onOp1={setOp1A} onOp2={setOp2A} />
				<BookSelector label="Player B" platform={pB} op1={op1B} op2={op2B} onPlatform={setPlatformB} onOp1={setOp1B} onOp2={setOp2B} />
			</div>

			{/* Entity stats */}
			<div style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
				<StatInput label="HP" value={hp} onChange={setHp} />
				<StatInput label="ATK" value={atk} onChange={setAtk} />
				<StatInput label="SP" value={sp} onChange={setSp} />
				<StatInput label="DEF" value={def} onChange={setDef} />
				<StatInput label="Seed" value={seed} onChange={setSeed} width={60} />
				<button type="button" onClick={handleRun} style={runBtnStyle}>Run Simulation</button>
				<button type="button" onClick={() => setShowAdvanced(!showAdvanced)} style={{ ...linkStyle }}>
					{showAdvanced ? "▾ Less" : "▸ More"}
				</button>
			</div>

			{/* Advanced: formulas + progression */}
			{showAdvanced && (
				<div style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center", flexWrap: "wrap", paddingLeft: 4 }}>
					<StatInput label="SP Regen" value={spRegen} onChange={setSpRegen} width={60} />
					<StatInput label="DR Constant" value={drConstant} onChange={setDrConstant} />
					<StatInput label="SP→Shield" value={spShieldRatio} onChange={setSpShieldRatio} width={50} />
					<StatInput label="悟境" value={enlightenment} onChange={setEnlightenment} width={40} />
					<StatInput label="融合" value={fusion} onChange={setFusion} width={50} />
				</div>
			)}
		</div>
	);
}

function StatInput({ label, value, onChange, width = 90 }: { label: string; value: number; onChange: (v: number) => void; width?: number }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
			<label style={{ fontSize: 11, color: "#5c6370" }}>{label}:</label>
			<input
				type="text"
				value={value}
				onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n)) onChange(n); }}
				style={{ ...inputStyle, width }}
			/>
		</div>
	);
}

const selectStyle: React.CSSProperties = { display: "block", width: "100%", background: "#1e2127", color: "#abb2bf", border: "1px solid #4b5263", borderRadius: 4, padding: "4px 6px", fontSize: 13, fontFamily: "inherit" };
const inputStyle: React.CSSProperties = { background: "#1e2127", color: "#abb2bf", border: "1px solid #4b5263", borderRadius: 4, padding: "4px 6px", fontSize: 12, fontFamily: "inherit" };
const runBtnStyle: React.CSSProperties = { background: "#61afef", color: "#282c34", border: "none", borderRadius: 4, padding: "6px 16px", cursor: "pointer", fontSize: 13, fontWeight: "bold", fontFamily: "inherit" };
const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "#5c6370", cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: 0 };
