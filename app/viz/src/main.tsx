import "@mantine/core/styles.css";
import { MantineProvider, createTheme } from "@mantine/core";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";

const theme = createTheme({
	primaryColor: "cyan",
	fontFamily: 'Menlo, "Fira Code", monospace',
	colors: {
		dark: [
			"#c8d6e5",
			"#a0b0c0",
			"#7a8a9a",
			"#4a6078",
			"#2a3a4a",
			"#1a2744",
			"#0f1724",
			"#0c1220",
			"#0a0e17",
			"#060a12",
		],
	},
});

const root = document.getElementById("root")!;
createRoot(root).render(
	<MantineProvider theme={theme} defaultColorScheme="dark">
		<App />
	</MantineProvider>,
);
