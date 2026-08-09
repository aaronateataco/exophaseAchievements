import { Logger } from "@utils/Logger";

import { describeFetchFailure } from "./netUtils";

// VencordNative is injected as a global by the client (see Vencord's
// src/VencordNative.ts) - no import needed, just declared for TS.
declare const VencordNative: {
    native: {
        openExternal(url: string): void;
    };
} | undefined;

const VERIFY_API_HOST = "exophaseverify.vercel.app";
const VERIFY_API_BASE = `https://${VERIFY_API_HOST}/api`;
const POLL_INTERVAL_MS = 2000;
// The backend's poll-code KV entry has a 10 minute TTL; we give up client-side
// a little before that so we always get a clean "timeout" instead of racing
// the KV expiry into a false "pending forever".
const POLL_TIMEOUT_MS = 9 * 60 * 1000;

const logger = new Logger("ExophaseAchievements");

/**
 * Mirrors VerifyCodeResult from ExophaseVerify's lib/kv.ts.
 */
export interface VerifyPollResult {
    status: "pending" | "success" | "failed";
    exophaseUsername?: string;
    matchedPlatforms?: string[];
    noEligibleConnections?: boolean;
    discordPlatformsChecked?: string[];
    exophasePlatformsChecked?: string[];
    reason?: string;
    /** Only present when status is "success". */
    settingsToken?: string;
    /** Only present when status is "success". */
    discordId?: string;
}

/**
 * Mirrors the public shape returned by GET /api/users/:discordId.
 */
export interface PublicUserVerification {
    verified: boolean;
    exophaseUsername: string;
    hiddenSections: string[];
}

export function buildVerifyStartUrl(exophaseUsername: string, code: string): string {
    const params = new URLSearchParams({ exophaseUsername, code });
    return `${VERIFY_API_BASE}/verify/start?${params.toString()}`;
}

/**
 * Opens the verify-start URL in the user's real system browser. OAuth consent
 * has to happen outside the Discord client (plugin rules forbid in-client
 * OAuth), which is also why this whole flow is poll-based rather than using
 * window.opener/postMessage.
 */
function openInExternalBrowser(url: string) {
    if (typeof VencordNative !== "undefined" && VencordNative?.native?.openExternal) {
        VencordNative.native.openExternal(url);
        return;
    }
    // Fallback for non-desktop targets where VencordNative isn't available.
    window.open(url, "_blank", "noopener,noreferrer");
}

async function pollVerify(code: string, signal?: AbortSignal): Promise<VerifyPollResult> {
    const startedAt = Date.now();

    let response: Response;
    try {
        response = await fetch(`${VERIFY_API_BASE}/verify/poll?code=${encodeURIComponent(code)}`, { signal });
    } catch (error) {
        if ((error as Error)?.name === "AbortError") throw error;
        throw new Error(describeFetchFailure(error, startedAt, VERIFY_API_HOST));
    }

    if (!response.ok) {
        throw new Error(`Verify poll failed (HTTP ${response.status})`);
    }
    return response.json();
}

/**
 * Public, unauthenticated read of a Discord user's verification state.
 * Returns null both when the user has never verified (HTTP 404) and when the
 * request itself fails, since callers treat "nothing to show" the same way
 * either way; failures are still logged.
 */
export async function fetchUserVerification(discordId: string, signal?: AbortSignal): Promise<PublicUserVerification | null> {
    const startedAt = Date.now();
    try {
        const response = await fetch(`${VERIFY_API_BASE}/users/${encodeURIComponent(discordId)}`, { signal });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Verification lookup failed (HTTP ${response.status})`);
        return await response.json();
    } catch (error) {
        if ((error as Error)?.name === "AbortError") throw error;
        logger.error("Failed to fetch verification for", discordId, describeFetchFailure(error, startedAt, VERIFY_API_HOST));
        return null;
    }
}

export async function updateHiddenSections(
    discordId: string,
    settingsToken: string,
    hiddenSections: string[]
): Promise<PublicUserVerification> {
    const startedAt = Date.now();

    let response: Response;
    try {
        response = await fetch(`${VERIFY_API_BASE}/users/${encodeURIComponent(discordId)}/settings`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${settingsToken}`,
            },
            body: JSON.stringify({ hiddenSections }),
        });
    } catch (error) {
        throw new Error(describeFetchFailure(error, startedAt, VERIFY_API_HOST));
    }

    if (!response.ok) {
        throw new Error(`Failed to update hidden sections (HTTP ${response.status})`);
    }
    return response.json();
}

export interface VerifyFlowHandlers {
    onPending?: () => void;
    onSuccess?: (result: VerifyPollResult) => void;
    onFailed?: (result: VerifyPollResult) => void;
    onTimeout?: () => void;
    onError?: (error: unknown) => void;
}

/**
 * Kicks off the full verify flow: generates a local `code`, opens
 * /verify/start in the system browser, then polls /verify/poll until the
 * callback has written a success/failed result (or we give up).
 *
 * Returns a handle that lets the caller cancel polling early (e.g. if the
 * settings panel unmounts).
 */
export function startVerifyFlow(exophaseUsername: string, handlers: VerifyFlowHandlers): { code: string; cancel: () => void; } {
    const code = crypto.randomUUID();
    const controller = new AbortController();
    let cancelled = false;
    const startedAt = Date.now();

    openInExternalBrowser(buildVerifyStartUrl(exophaseUsername, code));

    const tick = async () => {
        if (cancelled) return;

        try {
            const result = await pollVerify(code, controller.signal);
            if (cancelled) return;

            if (result.status === "pending") {
                handlers.onPending?.();
                if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
                    handlers.onTimeout?.();
                    return;
                }
                setTimeout(tick, POLL_INTERVAL_MS);
                return;
            }

            if (result.status === "success") {
                handlers.onSuccess?.(result);
            } else {
                handlers.onFailed?.(result);
            }
        } catch (error) {
            if ((error as Error)?.name === "AbortError") return;
            logger.error("Verify polling failed:", error);
            handlers.onError?.(error);
        }
    };

    setTimeout(tick, POLL_INTERVAL_MS);

    return {
        code,
        cancel: () => {
            cancelled = true;
            controller.abort();
        },
    };
}
