import { describe, expect, test } from "bun:test";
import { SimulationClock } from "./clock.js";

describe("SimulationClock", () => {
	test("starts at time 0", () => {
		const clock = new SimulationClock();
		expect(clock.now()).toBe(0);
	});

	test("advanceTo fires callbacks in time order", () => {
		const clock = new SimulationClock();
		const log: number[] = [];
		clock.setTimeout(() => log.push(3), 300);
		clock.setTimeout(() => log.push(1), 100);
		clock.setTimeout(() => log.push(2), 200);
		clock.advanceTo(300);
		expect(log).toEqual([1, 2, 3]);
		expect(clock.now()).toBe(300);
	});

	test("advanceTo only fires callbacks up to target time", () => {
		const clock = new SimulationClock();
		const log: number[] = [];
		clock.setTimeout(() => log.push(1), 100);
		clock.setTimeout(() => log.push(2), 200);
		clock.setTimeout(() => log.push(3), 300);
		clock.advanceTo(250);
		expect(log).toEqual([1, 2]);
		expect(clock.now()).toBe(250);
	});

	test("clearTimeout prevents callback from firing", () => {
		const clock = new SimulationClock();
		const log: number[] = [];
		clock.setTimeout(() => log.push(1), 100);
		const id = clock.setTimeout(() => log.push(2), 200);
		clock.setTimeout(() => log.push(3), 300);
		clock.clearTimeout(id);
		clock.drain();
		expect(log).toEqual([1, 3]);
	});

	test("simultaneous callbacks all fire at the same time", () => {
		const clock = new SimulationClock();
		const log: string[] = [];
		clock.setTimeout(() => log.push("a"), 100);
		clock.setTimeout(() => log.push("b"), 100);
		clock.setTimeout(() => log.push("c"), 100);
		clock.advanceTo(100);
		expect(log.sort()).toEqual(["a", "b", "c"]);
		expect(clock.now()).toBe(100);
	});

	test("zero delay fires immediately on next advance", () => {
		const clock = new SimulationClock();
		const log: number[] = [];
		clock.setTimeout(() => log.push(1), 0);
		expect(log).toEqual([]);
		clock.advanceTo(0);
		expect(log).toEqual([1]);
	});

	test("negative delay throws", () => {
		const clock = new SimulationClock();
		expect(() => clock.setTimeout(() => {}, -1)).toThrow("Negative delay");
	});

	test("drain fires all remaining callbacks", () => {
		const clock = new SimulationClock();
		const log: number[] = [];
		clock.setTimeout(() => log.push(1), 100);
		clock.setTimeout(() => log.push(2), 6000);
		clock.setTimeout(() => log.push(3), 30000);
		clock.drain();
		expect(log).toEqual([1, 2, 3]);
		expect(clock.now()).toBe(30000);
	});

	test("callback can schedule new callbacks", () => {
		const clock = new SimulationClock();
		const log: number[] = [];
		clock.setTimeout(() => {
			log.push(1);
			clock.setTimeout(() => log.push(2), 50);
		}, 100);
		clock.drain();
		expect(log).toEqual([1, 2]);
		expect(clock.now()).toBe(150);
	});

	test("pending count tracks scheduled callbacks", () => {
		const clock = new SimulationClock();
		expect(clock.pending).toBe(0);
		clock.setTimeout(() => {}, 100);
		clock.setTimeout(() => {}, 200);
		expect(clock.pending).toBe(2);
		clock.advanceTo(150);
		expect(clock.pending).toBe(1);
	});

	test("currentTime updates during callback execution", () => {
		const clock = new SimulationClock();
		const times: number[] = [];
		clock.setTimeout(() => times.push(clock.now()), 100);
		clock.setTimeout(() => times.push(clock.now()), 200);
		clock.drain();
		expect(times).toEqual([100, 200]);
	});
});
