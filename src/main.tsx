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
const CHUNK_RELOAD_MARKER = "pcm-chunk-reload-at-v1";
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;
const LOGIN_SW_RESET_MARKER = "pcm-login-sw-reset-v1";
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

function renderBootstrapFatalFallback(raw: unknown) {
	const message = String((raw as { message?: string })?.message ?? raw ?? "Erro inesperado ao inicializar aplicacao.");
	const root = document.getElementById("root");
	if (!root) return;

	root.innerHTML = `
	  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b1220;padding:24px;color:#e5e7eb;font-family:Segoe UI,Arial,sans-serif;">
	    <div style="max-width:640px;width:100%;background:#111827;border:1px solid #334155;border-radius:12px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.35);">
	      <h1 style="margin:0 0 8px 0;font-size:20px;">Falha ao carregar o sistema</h1>
	      <p style="margin:0 0 16px 0;font-size:14px;color:#cbd5e1;">Uma falha em runtime bloqueou a inicializacao apos o login. Tente as acoes abaixo.</p>
	      <div style="display:flex;gap:8px;flex-wrap:wrap;">
	        <button id="pcm-reload-btn" style="padding:10px 14px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;cursor:pointer;">Recarregar pagina</button>
	        <button id="pcm-login-btn" style="padding:10px 14px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;cursor:pointer;">Voltar ao login</button>
	      </div>
	      <p style="margin-top:14px;font-size:12px;color:#94a3b8;word-break:break-word;">${message}</p>
	    </div>
	  </div>
	`;

	const reloadBtn = document.getElementById("pcm-reload-btn");
	if (reloadBtn) {
		reloadBtn.addEventListener("click", () => window.location.reload());
	}

	const loginBtn = document.getElementById("pcm-login-btn");
	if (loginBtn) {
		loginBtn.addEventListener("click", () => {
			const next = encodeURIComponent(`${window.location.pathname}${window.location.search}` || "/dashboard");
			window.location.assign(`/login?next=${next}`);
		});
	}
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

function hasRecentChunkReload() {
	try {
		const raw = window.sessionStorage.getItem(CHUNK_RELOAD_MARKER);
		const timestamp = Number(raw ?? 0);
		return Number.isFinite(timestamp) && timestamp > 0 && Date.now() - timestamp <= CHUNK_RELOAD_COOLDOWN_MS;
	} catch {
		return false;
	}
}

async function clearClientCachesBeforeReload() {
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
					.filter((cacheName) => cacheName.includes("workbox") || cacheName.includes("vite-pwa") || cacheName.includes("supabase-cache"))
					.map((cacheName) => caches.delete(cacheName)),
			);
		}
	} catch {
	}
}

function recoverFromDynamicChunkError(raw: unknown) {
	if (!isDynamicChunkLoadError(raw)) return false;

	try {
		if (hasRecentChunkReload()) {
			return false;
		}

		const now = Date.now();
		window.sessionStorage.setItem(CHUNK_RELOAD_MARKER, String(now));

		void clearClientCachesBeforeReload().finally(() => {
			const targetUrl = new URL(window.location.href);
			targetUrl.searchParams.set("chunk_reload", now.toString());
			window.location.replace(targetUrl.toString());
		});
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

async function resetLoginServiceWorkerOnce() {
	if (typeof window === "undefined") return;
	if (window.location.pathname !== "/login") return;
	if (!("serviceWorker" in navigator)) return;

	try {
		if (window.sessionStorage.getItem(LOGIN_SW_RESET_MARKER) === "1") return;
		window.sessionStorage.setItem(LOGIN_SW_RESET_MARKER, "1");

		const registrations = await navigator.serviceWorker.getRegistrations();
		if (registrations.length === 0) return;

		await Promise.all(registrations.map((registration) => registration.unregister()));
		window.location.reload();
	} catch {
	}
}

void hardenOwnerRuntime().finally(() => {
	void resetLoginServiceWorkerOnce();
	try {
		createRoot(document.getElementById("root")!).render(<App />);
	} catch (error) {
		logger.error("bootstrap_render_failed", {
			error: String(error),
			path: window.location.pathname,
		});

		void reportCriticalClientIssue('CLIENT_BOOTSTRAP_RENDER_FAILED', {
			error: String(error),
			path: window.location.pathname,
		});

		renderBootstrapFatalFallback(error);
	}
});
