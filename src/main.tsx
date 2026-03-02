import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from "@/lib/logger";

window.addEventListener("error", (event) => {
	logger.error("unhandled_error", {
		message: event.message,
		source: event.filename,
		line: event.lineno,
		column: event.colno,
	});
});

window.addEventListener("unhandledrejection", (event) => {
	logger.error("unhandled_promise_rejection", {
		reason: String(event.reason ?? "unknown"),
	});
});

createRoot(document.getElementById("root")!).render(<App />);
