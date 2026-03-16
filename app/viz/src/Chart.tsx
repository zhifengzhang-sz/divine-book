import type { TimeSeries } from "./buildTimeSeries.ts";

interface ChartProps {
	series: TimeSeries[];
	width?: number;
	height?: number;
	title?: string;
}

/**
 * SVG line chart for time-series data.
 * Renders multiple series on the same axes.
 * Step-function rendering (horizontal lines between points).
 */
export function Chart({ series, width = 600, height = 200, title }: ChartProps) {
	if (series.length === 0 || series.every((s) => s.points.length === 0)) {
		return null;
	}

	const pad = { top: 24, right: 16, bottom: 32, left: 80 };
	const w = width - pad.left - pad.right;
	const h = height - pad.top - pad.bottom;

	// Compute axes bounds
	let maxT = 0;
	let maxV = 0;
	let minV = Number.POSITIVE_INFINITY;
	for (const s of series) {
		for (const p of s.points) {
			if (p.t > maxT) maxT = p.t;
			if (p.value > maxV) maxV = p.value;
			if (p.value < minV) minV = p.value;
		}
	}
	if (maxT === 0) maxT = 1;
	if (maxV === minV) {
		maxV = minV + 1;
		minV = Math.max(0, minV - 1);
	}
	minV = Math.min(0, minV); // always include 0

	const xScale = (t: number) => pad.left + (t / maxT) * w;
	const yScale = (v: number) => pad.top + h - ((v - minV) / (maxV - minV)) * h;

	// Build step-function paths
	function buildPath(points: { t: number; value: number }[]): string {
		if (points.length === 0) return "";
		let d = `M ${xScale(points[0].t)} ${yScale(points[0].value)}`;
		for (let i = 1; i < points.length; i++) {
			// Horizontal to new time, then vertical to new value
			d += ` H ${xScale(points[i].t)} V ${yScale(points[i].value)}`;
		}
		return d;
	}

	// Y-axis ticks
	const yTicks = 5;
	const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
		minV + ((maxV - minV) * i) / yTicks,
	);

	// X-axis ticks
	const xTicks = Math.min(6, Math.ceil(maxT));
	const xTickValues = Array.from({ length: xTicks + 1 }, (_, i) =>
		(maxT * i) / xTicks,
	);

	return (
		<div style={{ background: "#282c34", borderRadius: 8, border: "1px solid #4b5263", padding: 8, marginBottom: 8 }}>
			<svg width={width} height={height} style={{ display: "block" }}>
				{/* Title */}
				{title && (
					<text x={pad.left} y={14} fill="#e5c07b" fontSize={12} fontFamily="inherit">
						{title}
					</text>
				)}

				{/* Grid lines */}
				{yTickValues.map((v) => (
					<line
						key={`yg-${v}`}
						x1={pad.left}
						x2={width - pad.right}
						y1={yScale(v)}
						y2={yScale(v)}
						stroke="#3e4451"
						strokeDasharray="2,4"
					/>
				))}

				{/* Y-axis labels */}
				{yTickValues.map((v) => (
					<text
						key={`yl-${v}`}
						x={pad.left - 6}
						y={yScale(v) + 4}
						fill="#5c6370"
						fontSize={10}
						textAnchor="end"
						fontFamily="inherit"
					>
						{formatNumber(v)}
					</text>
				))}

				{/* X-axis labels */}
				{xTickValues.map((t) => (
					<text
						key={`xl-${t}`}
						x={xScale(t)}
						y={height - 4}
						fill="#5c6370"
						fontSize={10}
						textAnchor="middle"
						fontFamily="inherit"
					>
						{t.toFixed(1)}s
					</text>
				))}

				{/* Series lines */}
				{series.map((s) => (
					<path
						key={`${s.player}-${s.metric}`}
						d={buildPath(s.points)}
						fill="none"
						stroke={s.color}
						strokeWidth={2}
						strokeLinejoin="round"
					/>
				))}

				{/* Legend */}
				{series.map((s, i) => (
					<g key={`leg-${s.player}-${s.metric}`}>
						<line
							x1={pad.left + i * 120}
							x2={pad.left + i * 120 + 16}
							y1={height - 18}
							y2={height - 18}
							stroke={s.color}
							strokeWidth={2}
						/>
						<text
							x={pad.left + i * 120 + 20}
							y={height - 14}
							fill="#abb2bf"
							fontSize={10}
							fontFamily="inherit"
						>
							{s.label}
						</text>
					</g>
				))}
			</svg>
		</div>
	);
}

function formatNumber(n: number): string {
	if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
	if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
	return n.toFixed(0);
}
