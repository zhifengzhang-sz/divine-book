/**
 * SimulationClock — virtual time for instant simulation.
 *
 * Implements XState v5's Clock interface. All XState `after` transitions
 * and delayed `sendTo` calls use this clock instead of real time.
 *
 * Internally a min-heap priority queue ordered by scheduled time.
 * advanceTo(t) pops and executes all callbacks with time ≤ t.
 * drain() executes all remaining callbacks.
 *
 * A 36-second fight completes in <1ms wall time.
 */

interface ScheduledEntry {
	id: number;
	time: number;
	fn: () => void;
}

export class SimulationClock {
	private heap: ScheduledEntry[] = [];
	private currentTime = 0;
	private nextId = 1;
	private cancelled = new Set<number>();

	/** XState Clock interface: schedule a callback after `ms` milliseconds. */
	setTimeout(fn: () => void, ms: number): number {
		if (ms < 0) throw new Error(`Negative delay: ${ms}ms`);
		const id = this.nextId++;
		const entry: ScheduledEntry = { id, time: this.currentTime + ms, fn };
		this.heapPush(entry);
		return id;
	}

	/** XState Clock interface: cancel a scheduled callback. */
	clearTimeout(id: number): void {
		this.cancelled.add(id);
	}

	/** Advance clock to targetTime, firing all callbacks with time ≤ targetTime. */
	advanceTo(targetTime: number): void {
		while (this.heap.length > 0 && this.heap[0].time <= targetTime) {
			const entry = this.heapPop();
			if (this.cancelled.has(entry.id)) {
				this.cancelled.delete(entry.id);
				continue;
			}
			this.currentTime = entry.time;
			entry.fn();
		}
		this.currentTime = targetTime;
	}

	/** Execute all remaining callbacks in time order. */
	drain(): void {
		while (this.heap.length > 0) {
			const entry = this.heapPop();
			if (this.cancelled.has(entry.id)) {
				this.cancelled.delete(entry.id);
				continue;
			}
			this.currentTime = entry.time;
			entry.fn();
		}
	}

	/** Current simulation time in milliseconds. */
	now(): number {
		return this.currentTime;
	}

	/** Number of pending callbacks. */
	get pending(): number {
		return this.heap.length;
	}

	// ── Min-heap operations ──────────────────────────────────────────

	private heapPush(entry: ScheduledEntry): void {
		this.heap.push(entry);
		this.siftUp(this.heap.length - 1);
	}

	private heapPop(): ScheduledEntry {
		const top = this.heap[0];
		const last = this.heap.pop() as ScheduledEntry;
		if (this.heap.length > 0) {
			this.heap[0] = last;
			this.siftDown(0);
		}
		return top;
	}

	private siftUp(i: number): void {
		while (i > 0) {
			const parent = (i - 1) >> 1;
			if (this.heap[parent].time <= this.heap[i].time) break;
			[this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
			i = parent;
		}
	}

	private siftDown(i: number): void {
		const n = this.heap.length;
		while (true) {
			let smallest = i;
			const left = 2 * i + 1;
			const right = 2 * i + 2;
			if (left < n && this.heap[left].time < this.heap[smallest].time)
				smallest = left;
			if (right < n && this.heap[right].time < this.heap[smallest].time)
				smallest = right;
			if (smallest === i) break;
			[this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
			i = smallest;
		}
	}
}
