/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * The Exophase API isn't officially documented, so several fields below are
 * "best guess" aliases (e.g. name/title, icon/icon_url) covering the shapes
 * that have actually been observed in responses. Every consumer should read
 * through the small helpers in exophaseApi.ts rather than reaching into a
 * specific field directly, so that if the API's shape changes there is only
 * one place to fix it.
 */

export interface ExophaseAchievement {
    id?: string | number;
    name?: string;
    title?: string;
    game_title?: string;
    game?: string;
    description?: string;
    icon_url?: string;
    icon?: string;
    platform?: string;
    rarity_percent?: number;
    rarity?: number;
    earned_at?: string;
    unlocked_at?: string;
    url?: string;
    link?: string;
}

export interface ExophasePlatformSummary {
    platform: string;
    platform_username?: string;
    games_owned?: number;
}

export interface ExophaseStats {
    total_achievements?: number;
    total_unlocked?: number;
    total_games?: number;
    total_playtime_hours?: number;
    overall_completion_percentage?: number;
}

export interface ExophaseSummary {
    username: string;
    profile_url?: string;
    stats?: ExophaseStats;
    platforms?: ExophasePlatformSummary[];
    recent_achievements?: ExophaseAchievement[];
}

export interface SubTabsProps {
    platforms: string[];
    activePlatform: string;
    onSelect: (platform: string) => void;
}
