/** Obsidian Grimoire dark theme */
export const T = {
	bg: "#0d0d0d",
	bgGrad: "radial-gradient(ellipse at center, #1a1510 0%, #0d0d0d 70%)",
	panel: "#141414",
	panelHover: "#1c1c1c",
	border: "#2a2218",
	borderLight: "#3d3020",
	gold: "#d4a84b",
	goldBright: "#ffd700",
	goldDark: "#8b6914",
	text: "#c8c0b4",
	muted: "#6b6358",
	green: "#5d9b5d",
	red: "#b34747",
	blue: "#5b8cb5",
	heading: "'Cinzel', serif",
	mono: "'Menlo', 'Fira Code', 'SF Mono', monospace",
	radius: 4,
};

export const css = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: ${T.bg}; overflow: hidden; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
`;
