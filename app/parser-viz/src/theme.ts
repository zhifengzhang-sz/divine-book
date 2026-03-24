export const T = {
	bg: "#0c0b09",
	panel: "#131210",
	panelHi: "#1a1815",
	border: "#2a2520",
	borderHi: "#3d3528",
	gold: "#c9a84c",
	goldBright: "#e8cf7a",
	text: "#b8b0a4",
	muted: "#625c52",
	green: "#6a9e6a",
	red: "#a84848",
	blue: "#5888aa",
	heading: "'Cinzel', serif",
	mono: "'Menlo', 'Fira Code', 'SF Mono', monospace",
	r: 3,
};

export const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${T.bg};overflow-x:hidden}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
`;
