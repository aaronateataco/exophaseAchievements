/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

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
 * Fetches the full achievement list for a user. The API's response shape isn't
 * consistent between endpoints, so this normalises it down to a plain array
 * either way.
 */
export async function fetchAchievements(username: string, signal?: AbortSignal): Promise<ExophaseAchievement[]> {
    const data = await get<ExophaseAchievement[] | { achievements?: ExophaseAchievement[]; }>(
        `/user/${encodeURIComponent(username)}/achievements`,
        signal
    );

    return Array.isArray(data) ? data : (data.achievements ?? []);
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
        logger.error("Failed to fetch summary:", (error as Error)?.message ?? error);
        return null;
    }
}

function getAchievementTimestamp(achievement: ExophaseAchievement): number {
    const raw = achievement.earned_at ?? achievement.unlocked_at;
    if (!raw) return 0;
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Returns a new array of achievements sorted most-recent-first. Achievements
 * with no parseable earned/unlocked date sort to the end (stable relative to
 * each other) rather than throwing off the ordering of ones that do have a
 * date.
 *
 * The API's "summary" endpoint nominally has its own `recent_achievements`
 * field, but it isn't reliably populated - this is the robust alternative:
 * sort whatever achievement list we already fetched ourselves.
 */
export function sortByRecency(achievements: ExophaseAchievement[]): ExophaseAchievement[] {
    return [...achievements].sort((a, b) => getAchievementTimestamp(b) - getAchievementTimestamp(a));
}
