import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit";

const OWNER_DOMAIN = (import.meta.env.VITE_OWNER_DOMAIN || "owner.gppis.com.br").toLowerCase();
const LEGACY_OWNER_PROJECT_REF = "cplowhoklcegnjvwmrsk";
const OWNER_HARD_RESET_MARKER = "owner-runtime-hard-reset-v1";
const ACTIVE_SUPABASE_PROJECT_REF = (() => {
	const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
	if (!configuredUrl) return null;

	try {
		return new URL(configuredUrl).hostname.split(".")[0] || null;
	} catch {
		return null;
	}
})();

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

async function hardenOwnerRuntime() {
	if (typeof window === "undefined") return;

	const hostname = window.location.hostname.toLowerCase();
	if (hostname !== OWNER_DOMAIN) return;

	try {
		for (const storageKey of Object.keys(window.localStorage)) {
			if (storageKey.includes(LEGACY_OWNER_PROJECT_REF)) {
				window.localStorage.removeItem(storageKey);
				continue;
			}

			const isSupabaseAuthKey = /^sb-[a-z0-9]+-auth-token$/i.test(storageKey);
			const isCurrentProjectKey =
				ACTIVE_SUPABASE_PROJECT_REF
					? storageKey.includes(`sb-${ACTIVE_SUPABASE_PROJECT_REF}-auth-token`)
					: false;

			if (isSupabaseAuthKey && !isCurrentProjectKey) {
				window.localStorage.removeItem(storageKey);
			}
		}

		if (!ACTIVE_SUPABASE_PROJECT_REF) {
			window.localStorage.removeItem("supabase.auth.token");
		}
	} catch {
	}

	try {
		if ("serviceWorker" in navigator) {
			const registrations = await navigator.serviceWorker.getRegistrations();
			await Promise.all(registrations.map((registration) => registration.unregister()));
		}
	} catch {
	}

	try {
		if ("caches" in window) {
			const cacheKeys = await caches.keys();
			await Promise.all(
				cacheKeys
					.filter((cacheName) =>
						cacheName.includes("workbox") ||
						cacheName.includes("supabase-cache") ||
						cacheName.includes("vite-pwa"),
					)
					.map((cacheName) => caches.delete(cacheName)),
			);
		}
	} catch {
	}

	try {
		if (!window.sessionStorage.getItem(OWNER_HARD_RESET_MARKER)) {
			window.sessionStorage.setItem(OWNER_HARD_RESET_MARKER, "1");
			window.location.reload();
		}
	} catch {
	}
}

void hardenOwnerRuntime().finally(() => {
	createRoot(document.getElementById("root")!).render(<App />);
});
