/**
 * Obsidian Grimoire dark theme constants — shared across parser-viz.
 * Extracted from app/viz/src/components.tsx for reuse.
 */

export const T = {
	goldDark: "#b8860b",
	goldLight: "#ffd700",
	border: "#5c4033",
	bgDark: "rgba(0, 0, 0, 0.85)",
	bgPanel: "#1a1a1a",
	text: "#e0e0e0",
	textMuted: "#888",
	hp: "#e74c3c",
	sp: "#3498db",
	shield: "#9b59b6",
	green: "#2ecc71",
	red: "#e74c3c",
	orange: "#e67e22",
	cyan: "#1abc9c",
	heading: "'Cinzel', serif",
	headingCn: "'ZCOOL XiaoWei', 'Cinzel', serif",
	body: "'Menlo', 'Fira Code', monospace",
	mono: "'Menlo', 'Fira Code', monospace",
	accent: "#2ecc71",
	keyword: "#e5c07b",
	string: "#98c379",
	warn: "#e67e22",
	glow: (color: string, size = 10) => `0 0 ${size}px ${color}88`,
};

export const panelStyle: React.CSSProperties = {
	padding: 16,
	backgroundColor: T.bgPanel,
	borderRadius: 8,
	border: `1px solid ${T.border}`,
	boxShadow: `0 0 20px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.5)`,
};

export const selectStyle: React.CSSProperties = {
	display: "block",
	width: "100%",
	background: "#111",
	color: T.text,
	border: "1px solid #444",
	borderRadius: 4,
	padding: "6px 8px",
	fontSize: 13,
	fontFamily: T.body,
	boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8)",
	outline: "none",
};

export const labelStyle: React.CSSProperties = {
	fontSize: 11,
	color: T.textMuted,
	textShadow: "1px 1px 2px black",
	marginBottom: 4,
	display: "block",
};

export const stageHeaderStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 6,
	fontFamily: T.heading,
	fontSize: 13,
	color: T.goldLight,
	textShadow: "1px 1px 3px #000",
	marginBottom: 10,
	borderBottom: `1px solid ${T.goldDark}44`,
	paddingBottom: 6,
};

/** Circled stage number shown in headers */
export const stageNum: React.CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: 20,
	height: 20,
	borderRadius: "50%",
	background: T.goldDark,
	color: "#000",
	fontSize: 11,
	fontWeight: "bold",
	fontFamily: T.body,
	flexShrink: 0,
};

/** Muted subtitle after stage name */
export const stageSubtitle: React.CSSProperties = {
	fontSize: 10,
	color: T.textMuted,
	fontFamily: T.body,
	fontWeight: "normal",
	marginLeft: 2,
};

/** Color per effect type category */
export const TYPE_COLORS: Record<string, string> = {
	base_attack: T.orange,
	self_hp_cost: T.hp,
	self_hp_cost_per_hit: T.hp,
	percent_max_hp_damage: T.red,
	percent_current_hp_damage: T.red,
	self_lost_hp_damage: T.red,
	self_lost_hp_damage_per_hit: T.red,
	dot: T.red,
	self_hp_cost_dot: T.hp,
	self_lost_hp_damage_dot: T.red,
	debuff: "#c0392b",
	counter_debuff: "#c0392b",
	self_buff: T.green,
	counter_buff: T.green,
	shield: T.shield,
	self_heal: T.green,
	per_tick_heal: T.green,
	heal_echo_damage: T.cyan,
	summon: T.cyan,
	echo_damage: T.cyan,
	delayed_burst: T.orange,
	per_debuff_stack_damage: T.orange,
	buff_steal: T.shield,
	self_cleanse: T.cyan,
	crit_damage_bonus: T.orange,
	shield_destroy_damage: T.orange,
	no_shield_double_damage: T.orange,
	self_damage_taken_increase: T.red,
	periodic_escalation: T.orange,
	next_skill_carry: T.cyan,
	per_enemy_lost_hp: T.orange,
	untargetable: T.cyan,
	conditional_damage_cleanse: T.orange,
	skill_cooldown_debuff: "#c0392b",
	// Affix-specific types
	damage_increase: T.orange,
	skill_damage_increase: T.orange,
	ignore_damage_reduction: T.orange,
	buff_duration: T.green,
	buff_strength: T.green,
	buff_stack_increase: T.green,
	debuff_stack_increase: "#c0392b",
	all_state_duration: T.cyan,
	lifesteal: T.green,
	conditional_damage: T.orange,
	self_buff_extra: T.green,
	self_buff_extend: T.green,
};
