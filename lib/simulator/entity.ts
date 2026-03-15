/**
 * Entity — sovereign state machine that owns HP/ATK/DEF/SP.
 *
 * Pure class (no XState for now — simpler to test).
 * The entity receives intents and mutates its own state.
 */

import type {
	Intent,
	ActiveState,
	EntitySnapshot,
	OwnerStats,
	AtkDamageIntent,
	ApplyDebuffIntent,
	ApplyDotIntent,
	SelfBuffIntent,
	CounterStateIntent,
	DelayedBurstIntent,
	Operator,
} from "./types.js";

export class Entity {
	readonly id: string;
	readonly base_atk: number;
	readonly base_def: number;
	readonly base_sp: number;
	readonly max_hp: number;

	hp: number;
	states: ActiveState[] = [];
	total_damage_dealt = 0;
	total_damage_taken = 0;

	private events: string[] = [];

	constructor(id: string, hp: number, atk: number, def: number, sp: number) {
		this.id = id;
		this.max_hp = hp;
		this.hp = hp;
		this.base_atk = atk;
		this.base_def = def;
		this.base_sp = sp;
	}

	get alive(): boolean {
		return this.hp > 0;
	}

	get lost_hp(): number {
		return this.max_hp - this.hp;
	}

	// ─── Derived stats ────────────────────────────────────────────

	get effective_atk(): number {
		let atk = this.base_atk;
		for (const s of this.states) {
			if (s.kind === "buff" && s.source_intent.type === "SELF_BUFF") {
				const buff = s.source_intent;
				if (buff.atk_percent) {
					atk *= 1 + (buff.atk_percent * s.stacks) / 100;
				}
			}
		}
		return atk;
	}

	get effective_def(): number {
		let def = this.base_def;
		for (const s of this.states) {
			if (s.kind === "buff" && s.source_intent.type === "SELF_BUFF") {
				const buff = s.source_intent;
				if (buff.def_percent) {
					def *= 1 + (buff.def_percent * s.stacks) / 100;
				}
			}
		}
		return def;
	}

	get effective_dr(): number {
		let dr = 0;
		for (const s of this.states) {
			if (s.kind === "buff" && s.source_intent.type === "SELF_BUFF") {
				const buff = s.source_intent;
				if (buff.damage_reduction) {
					dr += buff.damage_reduction * s.stacks;
				}
			}
			if (s.kind === "debuff" && s.source_intent.type === "APPLY_DEBUFF") {
				const debuff = s.source_intent;
				if (debuff.stat === "damage_reduction") {
					dr += debuff.value * s.stacks;
				}
			}
		}
		return dr;
	}

	get self_damage_increase(): number {
		let increase = 0;
		for (const s of this.states) {
			if (s.kind === "damage_increase" && s.source_intent.type === "SELF_DAMAGE_INCREASE") {
				increase += s.source_intent.percent;
			}
		}
		return increase;
	}

	get shield_amount(): number {
		let total = 0;
		for (const s of this.states) {
			if (s.kind === "shield" && s.source_intent.type === "SHIELD") {
				total += s.source_intent.amount;
			}
		}
		return total;
	}

	get debuff_count(): number {
		return this.states.filter((s) => s.kind === "debuff" || s.kind === "dot").length;
	}

	get buff_count(): number {
		return this.states.filter((s) => s.kind === "buff").length;
	}

	get hp_floor_percent(): number {
		for (const s of this.states) {
			if (s.kind === "hp_floor" && s.source_intent.type === "HP_FLOOR") {
				return s.source_intent.percent;
			}
		}
		return 0;
	}

	// ─── Snapshot ─────────────────────────────────────────────────

	snapshot(): EntitySnapshot {
		return {
			id: this.id,
			atk: this.base_atk,
			effective_atk: this.effective_atk,
			hp: this.hp,
			max_hp: this.max_hp,
			def: this.effective_def,
			sp: this.base_sp,
			debuff_count: this.debuff_count,
			buff_count: this.buff_count,
			has_shield: this.shield_amount > 0,
			shield_amount: this.shield_amount,
			effective_dr: this.effective_dr,
			lost_hp: this.lost_hp,
		};
	}

	ownerStats(): OwnerStats {
		return {
			id: this.id,
			atk: this.base_atk,
			effective_atk: this.effective_atk,
			hp: this.hp,
			max_hp: this.max_hp,
			def: this.effective_def,
			sp: this.base_sp,
		};
	}

	// ─── Intent application ───────────────────────────────────────

	/**
	 * Apply a self-intent (from own book activation).
	 * Returns events for the log.
	 */
	applySelf(intent: Intent): string[] {
		this.events = [];
		switch (intent.type) {
			case "HP_COST":
				this.applyHpCost(intent.amount);
				break;
			case "SELF_BUFF":
				this.applyBuff(intent);
				break;
			case "SHIELD":
				this.applyShield(intent);
				break;
			case "HEAL":
				this.applyHeal(intent.amount);
				break;
			case "COUNTER_STATE":
				this.applyCounterState(intent);
				break;
			case "CLEANSE":
				this.applyCleanse(intent.count);
				break;
			case "LIFESTEAL":
				// Stored — applied after damage is dealt
				this.states.push({
					id: "lifesteal",
					kind: "buff",
					remaining: "permanent",
					stacks: 1,
					source_intent: intent,
				});
				break;
			case "SELF_DAMAGE_INCREASE":
				this.states.push({
					id: "self_damage_increase",
					kind: "damage_increase",
					remaining: intent.duration,
					stacks: 1,
					source_intent: intent,
				});
				this.log(`${this.id} self-damage increase +${intent.percent}% for ${intent.duration}s`);
				break;
			case "HP_FLOOR":
				this.states.push({
					id: "hp_floor",
					kind: "hp_floor",
					remaining: "permanent",
					stacks: 1,
					source_intent: intent,
				});
				break;
			case "UNTARGETABLE":
				this.states.push({
					id: "untargetable",
					kind: "buff",
					remaining: intent.duration,
					stacks: 1,
					source_intent: intent,
				});
				this.log(`${this.id} untargetable for ${intent.duration}s`);
				break;
			case "SELF_BUFF_EXTEND":
				for (const s of this.states) {
					if (s.kind === "buff" && typeof s.remaining === "number") {
						s.remaining += intent.value;
					}
				}
				break;
			case "CRIT_BONUS":
				// Modifies ATK_DAMAGE crit — handled in simulate, no state needed
				break;
		}
		return this.events;
	}

	/**
	 * Receive an opponent intent. Evaluates against own state.
	 * Returns [events, counter_intents_to_send_back].
	 */
	receiveIntent(intent: Intent, targetSnapshot: EntitySnapshot): [string[], Intent[]] {
		this.events = [];
		const counterIntents: Intent[] = [];

		// Check untargetable
		if (this.isUntargetable() && intent.type !== "HP_DAMAGE") {
			this.log(`${this.id} is untargetable — ignored ${intent.type}`);
			return [this.events, counterIntents];
		}

		switch (intent.type) {
			case "ATK_DAMAGE":
				this.receiveAtkDamage(intent, targetSnapshot, counterIntents);
				break;
			case "HP_DAMAGE":
				this.receiveHpDamage(intent);
				break;
			case "APPLY_DEBUFF":
				this.receiveDebuff(intent);
				break;
			case "APPLY_DOT":
				this.receiveDot(intent);
				break;
			case "DELAYED_BURST":
				this.receiveDelayedBurst(intent);
				break;
			case "DISPEL":
				this.receiveDispel(intent.count);
				break;
			case "BUFF_STEAL":
				this.receiveBuffSteal(intent, counterIntents);
				break;
			case "SHIELD_DESTROY":
				this.receiveShieldDestroy(intent);
				break;
		}

		return [this.events, counterIntents];
	}

	// ─── Tick state effects ───────────────────────────────────────

	/**
	 * Tick all active states by dt seconds. Returns events.
	 */
	tickStates(dt: number): string[] {
		this.events = [];

		for (const state of this.states) {
			if (typeof state.remaining === "number") {
				state.remaining -= dt;
			}

			// Tick DoTs
			if (state.kind === "dot" && state.source_intent.type === "APPLY_DOT") {
				const dot = state.source_intent;
				if (dot.damage_per_tick) {
					// ATK-based DoT (damage_per_tick is a % of ATK)
					const damage = (dot.damage_per_tick / 100) * state.stacks;
					this.takeDamage(damage, `dot:${state.id}`, true);
				} else {
					// HP-based DoT
					const base = this.getDotBase(dot.basis);
					const damage = (dot.percent / 100) * base * state.stacks;
					this.takeDamage(damage, `dot:${state.id}`, true);
				}
			}

			// Tick delayed burst expiry
			if (state.kind === "delayed_burst" && typeof state.remaining === "number" && state.remaining <= 0) {
				if (state.source_intent.type === "DELAYED_BURST") {
					const burst = state.source_intent;
					const damage = burst.burst_base_amount;
					this.takeDamage(damage, `burst:${state.id}`, false);
					this.log(`${this.id} delayed burst ${state.id} detonates for ${Math.round(damage)}`);
				}
			}
		}

		// Remove expired states
		this.states = this.states.filter((s) => {
			if (s.remaining === "permanent") return true;
			return s.remaining > 0;
		});

		return this.events;
	}

	// ─── Internal helpers ─────────────────────────────────────────

	private applyHpCost(amount: number): void {
		const actual = Math.min(this.hp - 1, amount); // Can't kill self with HP cost
		this.hp -= actual;
		this.log(`${this.id} HP cost: -${Math.round(actual)}`);
	}

	private applyBuff(intent: SelfBuffIntent): void {
		// Check if buff already exists — stack or refresh
		const existing = this.states.find(
			(s) => s.kind === "buff" && s.id === intent.id,
		);
		if (existing) {
			if (intent.per_hit_stack && intent.max_stacks) {
				existing.stacks = Math.min(existing.stacks + 1, intent.max_stacks);
			}
			if (typeof existing.remaining === "number" && typeof intent.duration === "number") {
				existing.remaining = intent.duration; // Refresh
			}
			return;
		}
		this.states.push({
			id: intent.id,
			kind: "buff",
			remaining: intent.duration,
			stacks: 1,
			source_intent: intent,
		});
		this.log(`${this.id} buff: ${intent.id}`);
	}

	private applyShield(intent: { type: "SHIELD"; amount: number; duration: number }): void {
		this.states.push({
			id: "shield",
			kind: "shield",
			remaining: intent.duration,
			stacks: 1,
			source_intent: intent,
		});
		this.log(`${this.id} shield: ${Math.round(intent.amount)} for ${intent.duration}s`);
	}

	private applyHeal(amount: number): void {
		const before = this.hp;
		this.hp = Math.min(this.max_hp, this.hp + amount);
		this.log(`${this.id} heals ${Math.round(this.hp - before)}`);
	}

	private applyCounterState(intent: CounterStateIntent): void {
		this.states.push({
			id: intent.id,
			kind: "counter",
			remaining: intent.duration,
			stacks: 1,
			source_intent: intent,
		});
		this.log(`${this.id} counter: ${intent.id}`);
	}

	private applyCleanse(count: number): void {
		let removed = 0;
		this.states = this.states.filter((s) => {
			if (removed >= count) return true;
			if (s.kind === "debuff" || s.kind === "dot") {
				// Check dispellable
				if (s.source_intent.type === "APPLY_DEBUFF" && s.source_intent.dispellable === false) {
					return true;
				}
				removed++;
				return false;
			}
			return true;
		});
		if (removed > 0) this.log(`${this.id} cleansed ${removed} debuffs`);
	}

	private receiveAtkDamage(
		intent: AtkDamageIntent,
		targetSnapshot: EntitySnapshot,
		counterIntents: Intent[],
	): void {
		let totalDamage = 0;

		for (let hit = 0; hit < intent.hits; hit++) {
			let damage = intent.amount_per_hit;

			// Evaluate operators
			for (const op of intent.operators) {
				damage = this.evaluateOperator(op, damage, targetSnapshot);
			}

			// Apply crit bonus
			if (intent.crit_bonus > 0) {
				damage *= 1 + intent.crit_bonus / 100;
			}

			// Apply self_damage_increase
			if (this.self_damage_increase > 0) {
				damage *= 1 + this.self_damage_increase / 100;
			}

			// DR bypass + own DR
			if (intent.dr_bypass < 1) {
				const dr = this.effective_dr * (1 - intent.dr_bypass);
				if (dr > 0) {
					damage *= 1 - dr / 100;
				} else if (dr < 0) {
					// Negative DR = damage amplification
					damage *= 1 + Math.abs(dr) / 100;
				}
			}

			// Shield absorption
			damage = this.absorbShield(damage);

			// HP floor
			if (this.hp_floor_percent > 0) {
				const floor = (this.hp_floor_percent / 100) * this.max_hp;
				if (this.hp - damage < floor) {
					damage = Math.max(0, this.hp - floor);
				}
			}

			this.hp -= damage;
			totalDamage += damage;

			// Per-hit debuff stacking
			for (const s of this.states) {
				if ((s.kind === "debuff" || s.kind === "dot") && s.source_intent.type === "APPLY_DEBUFF") {
					if (s.source_intent.per_hit_stack && s.source_intent.max_stacks) {
						s.stacks = Math.min(s.stacks + 1, s.source_intent.max_stacks);
					}
				}
			}
		}

		if (totalDamage > 0) {
			this.total_damage_taken += totalDamage;
			this.log(`${this.id} takes ${Math.round(totalDamage)} ATK damage (${intent.hits} hits)`);
		}

		// Trigger counters
		this.triggerCounters(totalDamage, counterIntents);

		// Clamp HP
		if (this.hp < 0) this.hp = 0;
	}

	private receiveHpDamage(intent: { type: "HP_DAMAGE"; percent: number; basis: "max" | "current" | "lost"; source: string }): void {
		const base = this.getDotBase(intent.basis);
		let damage = (intent.percent / 100) * base;

		// DR applies to HP damage too
		if (this.effective_dr > 0) {
			damage *= 1 - this.effective_dr / 100;
		}

		damage = this.absorbShield(damage);
		this.hp -= damage;
		if (this.hp < 0) this.hp = 0;
		this.total_damage_taken += damage;
		this.log(`${this.id} takes ${Math.round(damage)} HP damage (${intent.percent}% ${intent.basis})`);
	}

	private receiveDebuff(intent: ApplyDebuffIntent): void {
		// Check if debuff already exists — stack or refresh
		const existing = this.states.find(
			(s) => s.kind === "debuff" && s.id === intent.id,
		);
		if (existing) {
			if (typeof existing.remaining === "number" && typeof intent.duration === "number") {
				existing.remaining = intent.duration;
			}
			return;
		}
		this.states.push({
			id: intent.id,
			kind: "debuff",
			remaining: intent.duration,
			stacks: intent.stacks ?? 1,
			source_intent: intent,
		});
		this.log(`${this.id} debuffed: ${intent.id} (${intent.stat} ${intent.value})`);
	}

	private receiveDot(intent: ApplyDotIntent): void {
		const existing = this.states.find(
			(s) => s.kind === "dot" && s.id === intent.id,
		);
		if (existing) {
			if (intent.max_stacks) {
				existing.stacks = Math.min(existing.stacks + 1, intent.max_stacks);
			}
			if (typeof existing.remaining === "number") {
				existing.remaining = intent.duration; // Refresh
			}
			return;
		}
		this.states.push({
			id: intent.id,
			kind: "dot",
			remaining: intent.duration,
			stacks: 1,
			source_intent: intent,
		});
		this.log(`${this.id} DoT applied: ${intent.id}`);
	}

	private receiveDelayedBurst(intent: DelayedBurstIntent): void {
		this.states.push({
			id: intent.id,
			kind: "delayed_burst",
			remaining: intent.duration,
			stacks: 1,
			source_intent: intent,
		});
		this.log(`${this.id} delayed burst applied: ${intent.id} (${intent.duration}s)`);
	}

	private receiveDispel(count: number): void {
		let removed = 0;
		this.states = this.states.filter((s) => {
			if (removed >= count) return true;
			if (s.kind === "buff") {
				removed++;
				return false;
			}
			return true;
		});
		if (removed > 0) this.log(`${this.id} dispelled ${removed} buffs`);
	}

	private receiveBuffSteal(
		intent: { type: "BUFF_STEAL"; count: number; source: string },
		counterIntents: Intent[],
	): void {
		let stolen = 0;
		const stolenBuffs: ActiveState[] = [];
		this.states = this.states.filter((s) => {
			if (stolen >= intent.count) return true;
			if (s.kind === "buff") {
				stolenBuffs.push(s);
				stolen++;
				return false;
			}
			return true;
		});
		// Stolen buffs would be sent back — for now just remove them
		if (stolen > 0) this.log(`${this.id} had ${stolen} buffs stolen`);
	}

	private receiveShieldDestroy(intent: { type: "SHIELD_DESTROY"; count: number; bonus_hp_damage: number; no_shield_double: boolean; source: string }): void {
		const hadShield = this.shield_amount > 0;
		let destroyed = 0;
		this.states = this.states.filter((s) => {
			if (destroyed >= intent.count) return true;
			if (s.kind === "shield") {
				destroyed++;
				return false;
			}
			return true;
		});

		let damage = (intent.bonus_hp_damage / 100) * this.max_hp;
		if (!hadShield && intent.no_shield_double) {
			damage *= 2;
		}
		this.hp -= damage;
		if (this.hp < 0) this.hp = 0;
		this.total_damage_taken += damage;
		this.log(`${this.id} shield destroy: ${Math.round(damage)} damage`);
	}

	private triggerCounters(damageReceived: number, counterIntents: Intent[]): void {
		for (const s of this.states) {
			if (s.kind !== "counter" || s.source_intent.type !== "COUNTER_STATE") continue;
			const counter = s.source_intent;

			// Reflect damage
			if (counter.on_hit.reflect_received_damage) {
				const amount = (counter.on_hit.reflect_received_damage / 100) * damageReceived;
				counterIntents.push({
					type: "ATK_DAMAGE",
					amount_per_hit: amount,
					hits: 1,
					source: this.id,
					dr_bypass: 0,
					crit_bonus: 0,
					operators: [],
				});
			}

			// Reflect lost HP
			if (counter.on_hit.reflect_percent_lost_hp) {
				const amount = (counter.on_hit.reflect_percent_lost_hp / 100) * this.lost_hp;
				counterIntents.push({
					type: "ATK_DAMAGE",
					amount_per_hit: amount,
					hits: 1,
					source: this.id,
					dr_bypass: 0,
					crit_bonus: 0,
					operators: [],
				});
			}

			// Apply debuffs/DoTs to attacker
			if (counter.on_hit.apply_to_attacker && counter.on_hit.apply_to_attacker.length > 0) {
				const chance = counter.on_hit.chance ?? 100;
				if (Math.random() * 100 < chance) {
					counterIntents.push(...counter.on_hit.apply_to_attacker);
				}
			}
		}
	}

	private evaluateOperator(op: Operator, damage: number, snapshot: EntitySnapshot): number {
		switch (op.kind) {
			case "per_enemy_lost_hp": {
				// "enemy" = the target (this entity, the receiver)
				const lostPct = (this.lost_hp / this.max_hp) * 100;
				return damage * (1 + (lostPct * op.per_percent) / 100);
			}
			case "per_self_lost_hp": {
				// "self" = the attacker — use snapshot
				const lostPct = (snapshot.lost_hp / snapshot.max_hp) * 100;
				return damage * (1 + (lostPct * op.per_percent) / 100);
			}
			case "per_debuff_stack": {
				const stacks = Math.min(this.debuff_count, op.max_stacks);
				return damage * (1 + (stacks * op.value) / 100);
			}
			case "conditional": {
				if (this.evaluateCondition(op.condition)) {
					return damage * (1 + op.bonus_percent / 100);
				}
				return damage;
			}
		}
	}

	private evaluateCondition(condition: string): boolean {
		switch (condition) {
			case "target_hp_below_30":
			case "self_hp_below_30":
				return this.hp < this.max_hp * 0.3;
			case "target_hp_above_20":
			case "self_hp_above_20":
				return this.hp > this.max_hp * 0.2;
			case "target_controlled":
				return this.debuff_count > 0;
			case "target_has_no_healing":
				return true; // Simplified — no healing check
			default:
				return false;
		}
	}

	private absorbShield(damage: number): number {
		for (const s of this.states) {
			if (s.kind === "shield" && s.source_intent.type === "SHIELD") {
				const shield = s.source_intent;
				if (damage <= shield.amount) {
					shield.amount -= damage;
					return 0;
				}
				damage -= shield.amount;
				shield.amount = 0;
				// Remove depleted shield
				s.remaining = 0;
			}
		}
		return damage;
	}

	private getDotBase(basis: "max" | "current" | "lost"): number {
		switch (basis) {
			case "max":
				return this.max_hp;
			case "current":
				return this.hp;
			case "lost":
				return this.lost_hp;
		}
	}

	private takeDamage(amount: number, source: string, isDot: boolean): void {
		let damage = amount;

		// HP floor
		if (this.hp_floor_percent > 0) {
			const floor = (this.hp_floor_percent / 100) * this.max_hp;
			if (this.hp - damage < floor) {
				damage = Math.max(0, this.hp - floor);
			}
		}

		this.hp -= damage;
		if (this.hp < 0) this.hp = 0;
		this.total_damage_taken += damage;
		if (damage > 0) {
			this.log(`${this.id} takes ${Math.round(damage)} ${isDot ? "DoT" : ""} damage from ${source}`);
		}
	}

	private isUntargetable(): boolean {
		return this.states.some(
			(s) => s.id === "untargetable" && (s.remaining === "permanent" || s.remaining > 0),
		);
	}

	private log(msg: string): void {
		this.events.push(msg);
	}

	flushEvents(): string[] {
		const e = this.events;
		this.events = [];
		return e;
	}
}
