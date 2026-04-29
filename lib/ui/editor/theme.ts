export const T = {
	// Backgrounds
	bg: "#08070a",
	bgGrad: "linear-gradient(135deg, #08070a 0%, #0d0b12 50%, #0a0910 100%)",
	panel: "rgba(14, 13, 20, 0.85)",
	panelHi: "rgba(22, 20, 32, 0.9)",
	panelGlass: "rgba(18, 16, 28, 0.6)",
	card: "rgba(20, 18, 30, 0.7)",

	// Borders
	border: "rgba(60, 50, 80, 0.4)",
	borderHi: "rgba(90, 75, 120, 0.5)",
	borderGlow: "rgba(180, 140, 60, 0.15)",

	// Gold accent
	gold: "#c9a84c",
	goldBright: "#edd98b",
	goldDim: "#8a7432",
	goldGlow: "rgba(201, 168, 76, 0.12)",

	// Secondary
	cyan: "#5ec4d4",
	cyanGlow: "rgba(94, 196, 212, 0.1)",
	purple: "#9b7ed8",
	purpleGlow: "rgba(155, 126, 216, 0.08)",
	red: "#d45454",
	redGlow: "rgba(212, 84, 84, 0.1)",
	green: "#5cbe6c",
	greenGlow: "rgba(92, 190, 108, 0.12)",

	// Text
	text: "#c4beb4",
	textBright: "#e8e4dc",
	muted: "#5c5666",
	mutedLight: "#7a7284",
	blue: "#5888aa",

	// Typography
	heading: "'Cinzel', 'ZCOOL XiaoWei', serif",
	body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
	mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', monospace",

	// Radii
	r: 6,
	rLg: 10,

	// Shadows
	shadowSm: "0 2px 8px rgba(0, 0, 0, 0.3)",
	shadowMd: "0 4px 20px rgba(0, 0, 0, 0.4)",
	shadowGlow: "0 0 20px rgba(201, 168, 76, 0.06)",
};

export const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&family=ZCOOL+XiaoWei&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: ${T.bg};
  background-image: ${T.bgGrad};
  background-attachment: fixed;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(60, 50, 80, 0.5);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: rgba(90, 75, 120, 0.6); }

::selection {
  background: rgba(201, 168, 76, 0.25);
  color: ${T.textBright};
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 12px rgba(201, 168, 76, 0.08); }
  50% { box-shadow: 0 0 20px rgba(201, 168, 76, 0.15); }
}

@keyframes savedPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
`;
