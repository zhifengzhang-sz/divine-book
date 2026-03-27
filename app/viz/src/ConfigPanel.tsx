import { useState } from "react";
import type { GameData } from "./data-loader.ts";
import {
	Pill,
	StatInput,
	cancelBtnStyle,
	chipStyle,
	confirmBtnStyle,
	dialogStyle,
	dialogTitleStyle,
	labelStyle,
	linkStyle,
	overlayStyle,
	panelStyle,
	runBtnStyle,
	selectStyle,
} from "./components.tsx";
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

// ── Tier helpers ────────────────────────────────────────────────────

interface TierOption {
	label: string;
	enlightenment: number;
	fusion: number;
}

type EffectEntry = { type: string; data_state?: string | string[]; [k: string]: unknown };
type BookEntry = {
	school: string;
	skill_text?: string;
	affix_text?: string;
	exclusive_affix_text?: string;
	skill?: EffectEntry[];
	primary_affix?: { name: string; effects: EffectEntry[] };
	exclusive_affix?: { name: string; effects: EffectEntry[] };
};
// Set by initConfigData() when GameData loads
let allBooksData: Record<string, BookEntry> = {};
let allAffixesDataRefRef: {
	universal: Record<string, { text?: string; effects: EffectEntry[] }>;
	school: Record<string, Record<string, { text?: string; effects: EffectEntry[] }>>;
} = { universal: {}, school: {} };

export function initConfigData(gameData: GameData): void {
	allBooksData = (gameData.books as { books: Record<string, BookEntry> }).books;
	allAffixesDataRefRef = gameData.affixes as typeof allAffixesDataRefRef;
}

/** Extract unique tier options from a list of effects */
function getTierOptionsFromEffects(
	effects: EffectEntry[],
): TierOption[] {
	const seen = new Set<string>();
	const options: TierOption[] = [];
	for (const effect of effects) {
		const ds = effect.data_state;
		if (!ds || ds === "locked") continue;
		const entries = Array.isArray(ds) ? ds : [ds];
		let e = 0;
		let f = 0;
		for (const s of entries) {
			if (typeof s !== "string") continue;
			if (s.startsWith("enlightenment="))
				e = Number(s.split("=")[1]);
			if (s.startsWith("fusion=")) f = Number(s.split("=")[1]);
		}
		const key = `${e}/${f}`;
		if (seen.has(key)) continue;
		seen.add(key);
		options.push({
			label: `悟${e}/融${f}`,
			enlightenment: e,
			fusion: f,
		});
	}
	return options;
}

function getTierOptions(platform: string): TierOption[] {
	const book = allBooksData[platform];
	if (!book) return [];
	const allEffects: EffectEntry[] = [
		...(book.skill ?? []),
		...(book.primary_affix?.effects ?? []),
		...(book.exclusive_affix?.effects ?? []),
	];
	return getTierOptionsFromEffects(allEffects);
}

function getAffixTierOptions(affixName: string): TierOption[] {
	const effects = lookupAffixEffects(affixName);
	if (!effects || effects.length === 0) return [];
	return getTierOptionsFromEffects(effects);
}

/** Select highest matching tier per effect type (mirrors sim's selectTiers) */
function filterEffectsForTier(
	effects: EffectEntry[],
	e: number,
	f: number,
): EffectEntry[] {
	const byType = new Map<string, EffectEntry[]>();
	for (const effect of effects) {
		const group = byType.get(effect.type) ?? [];
		group.push(effect);
		byType.set(effect.type, group);
	}
	const result: EffectEntry[] = [];
	for (const [, tiers] of byType) {
		const usable = tiers.filter((t) => {
			const ds = t.data_state;
			if (!ds) return true;
			if (ds === "locked") return false;
			const entries = Array.isArray(ds) ? ds : [ds];
			for (const s of entries) {
				if (s.startsWith("enlightenment=") && e < Number(s.split("=")[1])) return false;
				if (s.startsWith("fusion=") && f < Number(s.split("=")[1])) return false;
			}
			return true;
		});
		if (usable.length > 0) result.push(usable[usable.length - 1]);
	}
	return result;
}

/** Format an effect entry as a readable string */
function formatEffect(effect: EffectEntry): string {
	const skip = new Set(["type", "data_state"]);
	const parts: string[] = [];
	for (const [k, v] of Object.entries(effect)) {
		if (skip.has(k)) continue;
		if (v === undefined || v === null) continue;
		if (typeof v === "number") {
			parts.push(`${k}=${v}`);
		} else if (typeof v === "boolean" && v) {
			parts.push(k);
		} else if (typeof v === "string") {
			parts.push(`${k}=${v}`);
		}
	}
	return parts.length > 0 ? `${effect.type}: ${parts.join(", ")}` : effect.type;
}

/** Preview panel showing effects at a given progression */
function EffectPreview({
	label,
	effects,
}: {
	label: string;
	effects: EffectEntry[];
}) {
	if (effects.length === 0) return null;
	return (
		<div style={{ marginBottom: 6 }}>
			<div style={{ fontSize: 11, color: "#e5c07b", marginBottom: 2 }}>{label}</div>
			{effects.map((e, i) => (
				<div key={`${e.type}-${i}`} style={{ fontSize: 11, color: "#abb2bf", paddingLeft: 8 }}>
					{formatEffect(e)}
				</div>
			))}
		</div>
	);
}

// ── Book Picker Dialog ──────────────────────────────────────────────

interface BookSelection {
	school: string;
	platform: string;
	enlightenment: number;
	fusion: number;
}

/** Find the best matching tier for given enlightenment/fusion */
function snapToTier(
	tiers: TierOption[],
	e: number,
	f: number,
): TierOption | undefined {
	// Exact match first
	const exact = tiers.find(
		(t) => t.enlightenment === e && t.fusion === f,
	);
	if (exact) return exact;
	// Highest tier that the player qualifies for (e >= tier.e && f >= tier.f)
	let best: TierOption | undefined;
	for (const t of tiers) {
		if (e >= t.enlightenment && f >= t.fusion) best = t;
	}
	// Fall back to highest tier
	return best ?? tiers[tiers.length - 1];
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
	const initTiers = getTierOptions(current.platform);
	const initSnap = snapToTier(
		initTiers,
		current.enlightenment,
		current.fusion,
	);
	const [sel, setSel] = useState<BookSelection>({
		...current,
		enlightenment: initSnap?.enlightenment ?? current.enlightenment,
		fusion: initSnap?.fusion ?? current.fusion,
	});
	const schoolBooks = books[sel.school] ?? [];
	const tierOptions = getTierOptions(sel.platform);

	return (
		<div style={overlayStyle} onClick={onCancel}>
			<div
				style={{ ...dialogStyle, maxHeight: "80vh", overflowY: "auto" }}
				onClick={(e) => e.stopPropagation()}
			>
				<div style={dialogTitleStyle}>Select 主位 (Skill Book)</div>

				<div style={{ marginBottom: 10 }}>
					<label style={labelStyle}>修为 (school)</label>
					<select
						value={sel.school}
						onChange={(e) => {
							const s = e.target.value;
							const sb = books[s] ?? [];
							const newPlatform = sb[0] ?? "";
							const newTiers = getTierOptions(newPlatform);
							const top = newTiers[newTiers.length - 1];
							setSel({
								...sel,
								school: s,
								platform: newPlatform,
								enlightenment: top?.enlightenment ?? sel.enlightenment,
								fusion: top?.fusion ?? sel.fusion,
							});
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
						onChange={(e) => {
							const newPlatform = e.target.value;
							const newTiers = getTierOptions(newPlatform);
							const top = newTiers[newTiers.length - 1];
							setSel({
								...sel,
								platform: newPlatform,
								enlightenment: top?.enlightenment ?? sel.enlightenment,
								fusion: top?.fusion ?? sel.fusion,
							});
						}}
						style={selectStyle}
					>
						{schoolBooks.map((b) => (
							<option key={b} value={b}>
								{b}
							</option>
						))}
					</select>
				</div>

				<div style={{ marginBottom: 10 }}>
					<label style={labelStyle}>Progression</label>
					<select
						value={`${sel.enlightenment}/${sel.fusion}`}
						onChange={(e) => {
							const [eStr, fStr] = e.target.value.split("/");
							setSel({
								...sel,
								enlightenment: Number(eStr),
								fusion: Number(fStr),
							});
						}}
						style={selectStyle}
					>
						{tierOptions.map((t) => (
							<option
								key={t.label}
								value={`${t.enlightenment}/${t.fusion}`}
							>
								{t.label}
							</option>
						))}
					</select>
				</div>

				{/* Book preview: raw text + parsed effects */}
				{(() => {
					const bookData = allBooksData[sel.platform];
					if (!bookData) return null;
					const skillEffects = bookData.skill
						? filterEffectsForTier(bookData.skill, sel.enlightenment, sel.fusion)
						: [];
					const primaryEffects = bookData.primary_affix
						? filterEffectsForTier(bookData.primary_affix.effects, sel.enlightenment, sel.fusion)
						: [];
					return (
						<div
							style={{
								background: "#1e2127",
								border: "1px solid #3e4451",
								borderRadius: 4,
								padding: 8,
								marginBottom: 10,
								fontSize: 11,
							}}
						>
							{bookData.skill_text && (
								<>
									<div style={{ color: "#e5c07b", marginBottom: 2 }}>原文 — Skill</div>
									<div style={{ color: "#7f848e", whiteSpace: "pre-wrap", marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid #3e4451" }}>
										{bookData.skill_text}
									</div>
								</>
							)}
							<EffectPreview label="→ Parsed Effects" effects={skillEffects} />
							{bookData.affix_text && (
								<>
									<div style={{ color: "#e5c07b", marginBottom: 2, marginTop: 6 }}>原文 — Primary Affix</div>
									<div style={{ color: "#7f848e", whiteSpace: "pre-wrap", marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid #3e4451" }}>
										{bookData.affix_text}
									</div>
								</>
							)}
							{primaryEffects.length > 0 && (
								<EffectPreview
									label={`→ Parsed: ${bookData.primary_affix?.name ?? "Primary Affix"}`}
									effects={primaryEffects}
								/>
							)}
							{bookData.exclusive_affix_text && (
								<>
									<div style={{ color: "#e5c07b", marginBottom: 2, marginTop: 6 }}>原文 — Exclusive Affix ({bookData.exclusive_affix?.name})</div>
									<div style={{ color: "#7f848e", whiteSpace: "pre-wrap", marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid #3e4451" }}>
										{bookData.exclusive_affix_text}
									</div>
								</>
							)}
							{bookData.exclusive_affix && (
								<EffectPreview
									label={`→ Parsed: ${bookData.exclusive_affix.name}`}
									effects={filterEffectsForTier(bookData.exclusive_affix.effects, sel.enlightenment, sel.fusion)}
								/>
							)}
						</div>
					);
				})()}

				<div
					style={{
						display: "flex",
						gap: 8,
						justifyContent: "flex-end",
					}}
				>
					<button
						type="button"
						onClick={onCancel}
						className={cancelBtnStyle}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => onConfirm(sel)}
						className={confirmBtnStyle}
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


/** Look up an affix's effects from affixes-data.json or exclusive affixes in books-data */
function lookupAffixEffects(name: string): EffectEntry[] | undefined {
	// Universal
	if (allAffixesDataRef.universal[name]) return allAffixesDataRef.universal[name].effects;
	// School
	for (const school of Object.values(allAffixesDataRef.school)) {
		if (school[name]) return school[name].effects;
	}
	// Exclusive (from books data)
	for (const book of Object.values(allBooksData)) {
		if (book.exclusive_affix?.name === name) return book.exclusive_affix.effects;
	}
	return undefined;
}

/** Look up an affix's raw text */
function lookupAffixText(name: string): string | undefined {
	// Universal
	if (allAffixesDataRef.universal[name]?.text) return allAffixesDataRef.universal[name].text;
	// School
	for (const school of Object.values(allAffixesDataRef.school)) {
		if (school[name]?.text) return school[name].text;
	}
	// Exclusive — raw text is in the book's exclusive_affix_text
	for (const book of Object.values(allBooksData)) {
		if (book.exclusive_affix?.name === name) return book.exclusive_affix_text ?? book.affix_text;
	}
	return undefined;
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

	/** When an affix is selected, snap to the best available tier */
	const selectAffix = (name: string) => {
		const tierOpts = name ? getAffixTierOptions(name) : [];
		const snapped = snapToTier(tierOpts, sel.enlightenment ?? 0, sel.fusion ?? 0);
		setSel({
			...sel,
			name,
			enlightenment: snapped?.enlightenment ?? sel.enlightenment ?? 0,
			fusion: snapped?.fusion ?? sel.fusion ?? 0,
		});
	};

	return (
		<div style={overlayStyle} onClick={onCancel}>
			<div
				style={{ ...dialogStyle, maxHeight: "80vh", overflowY: "auto" }}
				onClick={(e) => e.stopPropagation()}
			>
				<div style={dialogTitleStyle}>Select 辅位 (Affix)</div>

				<div style={{ marginBottom: 10 }}>
					<label style={labelStyle}>类别 (category)</label>
					<select
						value={sel.category}
						onChange={(e) =>
							setSel({ ...sel, category: e.target.value, name: "" })
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
						onChange={(e) => selectAffix(e.target.value)}
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

				{/* Progression dropdown (same as book dialog) */}
				{(() => {
					const tierOpts = sel.name ? getAffixTierOptions(sel.name) : [];
					if (tierOpts.length === 0) return null;
					return (
						<div style={{ marginBottom: 10 }}>
							<label style={labelStyle}>Progression</label>
							<select
								value={`${sel.enlightenment}/${sel.fusion}`}
								onChange={(e) => {
									const [eStr, fStr] = e.target.value.split("/");
									setSel({
										...sel,
										enlightenment: Number(eStr),
										fusion: Number(fStr),
									});
								}}
								style={selectStyle}
							>
								{tierOpts.map((t) => (
									<option
										key={t.label}
										value={`${t.enlightenment}/${t.fusion}`}
									>
										{t.label}
									</option>
								))}
							</select>
						</div>
					);
				})()}

				{/* Affix preview: raw text + parsed effects */}
				{sel.name && (() => {
					const rawEffects = lookupAffixEffects(sel.name);
					const rawText = lookupAffixText(sel.name);
					if ((!rawEffects || rawEffects.length === 0) && !rawText) return null;
					const filtered = rawEffects ? filterEffectsForTier(rawEffects, sel.enlightenment, sel.fusion) : [];
					return (
						<div
							style={{
								background: "#111",
								border: "1px solid #444",
								borderRadius: 4,
								padding: 8,
								marginBottom: 10,
								fontSize: 11,
								maxHeight: 200,
								overflowY: "auto",
								boxShadow: "inset 0 2px 5px rgba(0,0,0,0.5)",
							}}
						>
							{rawText && (
								<>
									<div style={{ color: "#ffd700", marginBottom: 2 }}>原文</div>
									<div style={{ color: "#888", whiteSpace: "pre-wrap", marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid #b8860b44" }}>
										{rawText}
									</div>
								</>
							)}
							{filtered.length > 0 && (
								<EffectPreview label="→ Parsed Effects" effects={filtered} />
							)}
						</div>
					);
				})()}

				<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
					<button type="button" onClick={onCancel} className={cancelBtnStyle}>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => onConfirm(sel)}
						className={confirmBtnStyle}
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

			{/* Row 1: 主位 + 辅位1 + 辅位2 */}
			<div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
				<Pill label="主位" value={bookLabel} onClick={onOpenBookDialog} />
				<Pill
					label="辅位1"
					value={
						state.op1
							? `${state.op1} (悟${state.op1Enlightenment}/融${state.op1Fusion})`
							: ""
					}
					onClick={() => onOpenAffixDialog(1)}
				/>
				<Pill
					label="辅位2"
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
				<button type="button" onClick={handleRun} className={runBtnStyle}>
					Run Simulation
				</button>
				<button
					type="button"
					onClick={() => setShowAdvanced(!showAdvanced)}
					className={linkStyle}
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

