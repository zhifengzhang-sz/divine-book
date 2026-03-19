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
		seed: number;
	};
	events: SimEvent[];
	result: {
		winner: "A" | "B" | null;
		aFinal: {
			hp: number;
			sp: number;
			shield: number;
			atk: number;
			def: number;
			alive: boolean;
		};
		bFinal: {
			hp: number;
			sp: number;
			shield: number;
			atk: number;
			def: number;
			alive: boolean;
		};
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
