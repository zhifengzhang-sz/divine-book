/**
 * RPG icon component — uses Shikashi sprite sheet with CSS background-position.
 * Sprite grid: 32x32px per icon, 16 columns, 20 rows (512x640).
 */

const SPRITE_URL = "/assets/icons-sprite.png";
const ICON_SIZE = 32;
const COLS = 16;

/** Icon position as [col, row] in the sprite sheet */
type IconPos = [number, number];

/** Map of icon names to sprite positions [col, row] — counted from the sprite sheet */
const ICON_MAP: Record<string, IconPos> = {
	// Row 0: misc status
	sword_icon: [0, 0],
	sparkle: [6, 0],
	heart: [8, 0],
	lightning: [9, 0],
	water: [13, 0],

	// Row 1: arrows
	arrow_up: [0, 1],
	arrow_down: [1, 1],

	// Row 2: UI/environment
	fire: [9, 1],
	skull: [3, 2],
	crosshair: [5, 2],

	// Row 3: weapons
	sword: [0, 3],
	sword2: [1, 3],
	dagger: [3, 3],
	sword_crossed: [8, 3],
	axe: [10, 3],

	// Row 4: shields & tools
	shield: [1, 4],
	shield2: [2, 4],
	pickaxe: [5, 4],

	// Row 5: armor
	armor: [3, 5],
	ring: [8, 5],

	// Row 6: potions
	potion_red: [0, 6],
	potion_blue: [1, 6],
	potion_green: [2, 6],
	crystal_ball: [9, 6],
	hourglass: [15, 6],

	// Row 8-9: instruments & misc
	scroll: [5, 8],

	// Row 10: books
	book_red: [0, 10],
	book_blue: [1, 10],
	book_green: [2, 10],
	book_brown: [3, 10],
	book_open: [4, 10],
	letter: [5, 10],

	// Row 11: food
	apple: [0, 11],
};

/** Map effect types to icon names */
const EFFECT_ICON_MAP: Record<string, string> = {
	// Damage
	base_attack: "sword_crossed",
	flat_extra_damage: "sword2",
	percent_max_hp_damage: "crosshair",
	percent_current_hp_damage: "crosshair",
	self_lost_hp_damage: "fire",
	conditional_damage: "lightning",
	per_debuff_stack_damage: "dagger",
	per_buff_stack_damage: "dagger",
	per_debuff_stack_true_damage: "dagger",
	per_enemy_lost_hp: "crosshair",
	per_self_lost_hp: "fire",
	delayed_burst: "fire",

	// Multipliers
	damage_increase: "arrow_up",
	skill_damage_increase: "arrow_up",
	attack_bonus: "arrow_up",
	crit_damage_bonus: "lightning",
	per_hit_escalation: "arrow_up",
	periodic_escalation: "arrow_up",
	probability_multiplier: "sparkle",
	ignore_damage_reduction: "shield",

	// Buffs
	self_buff: "potion_green",
	conditional_buff: "potion_green",
	counter_buff: "shield2",
	self_buff_extra: "potion_green",
	next_skill_buff: "sparkle",
	damage_reduction_during_cast: "shield",
	buff_strength: "arrow_up",

	// Debuffs
	debuff: "potion_red",
	conditional_debuff: "potion_red",
	counter_debuff: "potion_red",
	attack_reduction: "arrow_down",
	enemy_skill_damage_reduction: "arrow_down",

	// Healing
	self_heal: "heart",
	heal_echo_damage: "heart",
	lifesteal: "heart",
	conditional_heal_buff: "heart",

	// Shield
	shield: "shield2",
	shield_strength: "shield2",
	shield_destroy_damage: "axe",

	// DoT
	dot: "fire",

	// SP
	guaranteed_resonance: "water",
	self_hp_cost: "potion_red",

	// State
	self_damage_taken_increase: "arrow_down",
	buff_steal: "sparkle",
	self_cleanse: "sparkle",
	periodic_dispel: "sparkle",

	// Books/scrolls
	summon: "book_open",
	book: "book_brown",
};

/** Map state kinds to icons */
const STATE_ICON_MAP: Record<string, string> = {
	buff: "potion_green",
	debuff: "potion_red",
	named: "crystal_ball",
};

/** Render a sprite icon */
export function Icon({
	name,
	size = 20,
}: {
	name: string;
	size?: number;
}) {
	const pos = ICON_MAP[name];
	if (!pos) return null;

	const scale = size / ICON_SIZE;
	const [col, row] = pos;

	return (
		<span
			style={{
				display: "inline-block",
				width: size,
				height: size,
				backgroundImage: `url('${SPRITE_URL}')`,
				backgroundPosition: `-${col * ICON_SIZE * scale}px -${row * ICON_SIZE * scale}px`,
				backgroundSize: `${512 * scale}px ${640 * scale}px`,
				backgroundRepeat: "no-repeat",
				verticalAlign: "middle",
				imageRendering: "pixelated",
				filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.5))",
			}}
		/>
	);
}

/** Get icon name for an effect type */
export function getEffectIcon(effectType: string): string | null {
	return EFFECT_ICON_MAP[effectType] ?? null;
}

/** Get icon name for a state kind */
export function getStateIcon(kind: string): string | null {
	return STATE_ICON_MAP[kind] ?? null;
}
