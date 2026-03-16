import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit";

const OWNER_DOMAIN = (import.meta.env.VITE_OWNER_DOMAIN || "owner.gppis.com.br").toLowerCase();
const OWNER_DOMAIN_ALIASES = new Set([
	OWNER_DOMAIN,
	OWNER_DOMAIN.startsWith("www.") ? OWNER_DOMAIN.slice(4) : `www.${OWNER_DOMAIN}`,
]);
const LEGACY_OWNER_PROJECT_REF = "cplowhoklcegnjvwmrsk";
const OWNER_HARD_RESET_MARKER = "owner-runtime-hard-reset-v1";
const CHUNK_RELOAD_MARKER = "pcm-chunk-reload-once-v1";
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

function isDynamicChunkLoadError(raw: unknown) {
	const message = String(
		(raw as { message?: string })?.message
			?? raw
			?? "",
	).toLowerCase();

	return (
		message.includes("failed to fetch dynamically imported module") ||
		message.includes("importing a module script failed") ||
		message.includes("loading chunk") ||
		message.includes("chunkloaderror")
	);
}

function recoverFromDynamicChunkError(raw: unknown) {
	if (!isDynamicChunkLoadError(raw)) return false;

	try {
		if (window.sessionStorage.getItem(CHUNK_RELOAD_MARKER) === "1") {
			return false;
		}

		window.sessionStorage.setItem(CHUNK_RELOAD_MARKER, "1");
		const targetUrl = new URL(window.location.href);
		targetUrl.searchParams.set("chunk_reload", Date.now().toString());
		window.location.replace(targetUrl.toString());
		return true;
	} catch {
		return false;
	}
}

window.addEventListener("error", (event) => {
	if (recoverFromDynamicChunkError(event.error ?? event.message)) {
		return;
	}

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
	if (recoverFromDynamicChunkError(event.reason)) {
		event.preventDefault();
		return;
	}

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
	if (!OWNER_DOMAIN_ALIASES.has(hostname)) return;

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
	try {
		window.sessionStorage.removeItem(CHUNK_RELOAD_MARKER);
	} catch {
	}
});
