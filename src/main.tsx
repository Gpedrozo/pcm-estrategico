import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit";

async function reportCriticalClientIssue(action: string, metadata: Record<string, unknown>) {
	await writeAuditLog({
		action,
		table: 'client_runtime',
		source: 'main_global_handlers',
		severity: 'critical',
		metadata,
	});
}

window.addEventListener("error", (event) => {
	logger.error("unhandled_error", {
		message: event.message,
		source: event.filename,
		line: event.lineno,
		column: event.colno,
	});

	void reportCriticalClientIssue('CLIENT_UNHANDLED_ERROR', {
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

	void reportCriticalClientIssue('CLIENT_UNHANDLED_REJECTION', {
		reason: String(event.reason ?? "unknown"),
	});
});

createRoot(document.getElementById("root")!).render(<App />);
