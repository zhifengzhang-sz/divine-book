export interface SimulationData {
	config: {
		playerA: {
			label: string;
			book: string;
			hp: number;
			atk: number;
			sp: number;
			def: number;
			spRegen: number;
		};
		playerB: {
			label: string;
			book: string;
			hp: number;
			atk: number;
			sp: number;
			def: number;
			spRegen: number;
		};
		formulas: { dr_constant: number; sp_shield_ratio: number };
		progression: { enlightenment: number; fusion: number };
		seed: number;
	};
	events: SimEvent[];
	result: {
		winner: "A" | "B" | null;
		aFinalHp: number;
		bFinalHp: number;
	};
}

export type SimEvent = {
	type: string;
	player: string;
	t: number;
	[key: string]: unknown;
};

export interface ActiveState {
	name: string;
	kind: "buff" | "debuff" | "named";
	source: string;
}

export interface PlayerSnapshot {
	hp: number;
	maxHp: number;
	sp: number;
	maxSp: number;
	shield: number;
	atk: number;
	baseAtk: number;
	def: number;
	baseDef: number;
	alive: boolean;
	states: ActiveState[];
}
