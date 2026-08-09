import { Logger } from "@utils/Logger";

import { ExophaseAchievement, ExophaseSummary } from "./types";

const API_BASE = "https://exophaseapi.vercel.app/api/v1";
const logger = new Logger("ExophaseAchievements");

export function getExophaseProfileUrl(username: string) {
    return `https://www.exophase.com/user/${encodeURIComponent(username)}`;
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, { signal });

    if (!response.ok) {
        throw new Error(`Exophase API request failed (HTTP ${response.status})`);
    }

    return response.json() as Promise<T>;
}

/**
 * Fetches the achievement list for a user, optionally scoped to a single platform.
 * The API's response shape isn't consistent between endpoints, so this normalises
 * it down to a plain array either way.
 */
export async function fetchAchievements(username: string, platform?: string, signal?: AbortSignal): Promise<ExophaseAchievement[]> {
    const query = platform && platform !== "All" ? `?platform=${encodeURIComponent(platform.toLowerCase())}` : "";
    const data = await get<ExophaseAchievement[] | { achievements?: ExophaseAchievement[]; }>(
        `/user/${encodeURIComponent(username)}/achievements${query}`,
        signal
    );

    return Array.isArray(data) ? data : (data?.achievements ?? []);
}

/**
 * Fetches the profile summary (stats, connected platforms, recent achievements)
 * for a user. Returns null on failure instead of throwing, since callers treat
 * "no summary" the same as "nothing to show" rather than a hard error.
 */
export async function fetchSummary(username: string, signal?: AbortSignal): Promise<ExophaseSummary | null> {
    try {
        return await get<ExophaseSummary>(`/user/${encodeURIComponent(username)}/summary`, signal);
    } catch (error) {
        if ((error as Error)?.name === "AbortError") throw error;
        logger.error("Failed to fetch summary:", error);
        return null;
    }
}
