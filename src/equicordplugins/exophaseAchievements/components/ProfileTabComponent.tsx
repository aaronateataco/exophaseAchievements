import { Logger } from "@utils/Logger";
import { moment, React, Tooltip, useEffect, useMemo, useState } from "@webpack/common";
import { User } from "@vencord/discord-types";

import { fetchAchievements, fetchSummary, getExophaseProfileUrl } from "../exophaseApi";
import { settings } from "../index";
import { ExophaseAchievement, ExophaseSummary } from "../types";
import { ExophaseCard } from "./ExophaseCard";
import { ExophaseSubTabs } from "./ExophaseSubTabs";

const logger = new Logger("ExophaseAchievements");

interface ProfileTabProps {
    user: User;
    tabLabel: string;
}

type GamesByPlatform = Record<string, Record<string, ExophaseAchievement[]>>;

const LATEST_ACHIEVEMENT_COUNT = 20;

function formatTime(rawDate?: string | null) {
    if (!rawDate) return "Unlocked";
    const parsed = moment(rawDate);
    return parsed.isValid() ? parsed.fromNow() : rawDate;
}

function groupByPlatformAndGame(achievements: ExophaseAchievement[]): GamesByPlatform {
    const grouped: GamesByPlatform = {};

    for (const achievement of achievements) {
        const platform = achievement.platform || "Other";
        const game = achievement.game_title || achievement.game || "Unknown Game";

        grouped[platform] ??= {};
        grouped[platform][game] ??= [];
        grouped[platform][game].push(achievement);
    }

    return grouped;
}

export function ProfileTabComponent({ tabLabel }: ProfileTabProps) {
    const username = settings.store.exophaseUsername;

    const [achievements, setAchievements] = useState<ExophaseAchievement[]>([]);
    const [summary, setSummary] = useState<ExophaseSummary | null>(null);
    const [platforms, setPlatforms] = useState<string[]>(["All"]);
    const [activePlatform, setActivePlatform] = useState("All");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!username) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);

        Promise.all([
            fetchAchievements(username, activePlatform, controller.signal),
            fetchSummary(username, controller.signal),
        ])
            .then(([achievementList, summaryData]) => {
                setAchievements(achievementList);
                if (summaryData) setSummary(summaryData);

                if (activePlatform === "All") {
                    const uniquePlatforms = Array.from(new Set(achievementList.map(a => a.platform).filter(Boolean))) as string[];
                    setPlatforms(["All", ...uniquePlatforms]);
                }
            })
            .catch(err => {
                if (err?.name === "AbortError") return;
                logger.error("Failed to load achievements:", err);
                setError("Couldn't load your achievements from Exophase. Please try again later.");
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [activePlatform, username]);

    const groupedByPlatform = useMemo(() => groupByPlatformAndGame(achievements), [achievements]);

    if (!username) {
        return (
            <div className="vc-exophase-container">
                <p className="vc-exophase-meta">
                    Set your Exophase username in the plugin settings to see your {tabLabel.toLowerCase()} here.
                </p>
            </div>
        );
    }

    if (loading && !summary) {
        return (
            <div className="vc-exophase-container">
                <p className="vc-exophase-meta">Loading {tabLabel.toLowerCase()}...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="vc-exophase-container">
                <p className="vc-exophase-meta vc-exophase-error">{error}</p>
            </div>
        );
    }

    const totalUnlocked = summary?.stats?.total_achievements ?? achievements.length;
    const totalPlaytime = summary?.stats?.total_playtime_hours;
    const completion = summary?.stats?.overall_completion_percentage;
    const latestAchievements = achievements.slice(0, LATEST_ACHIEVEMENT_COUNT);

    return (
        <div className="vc-exophase-container">
            <div className="vc-exophase-stats-bar">
                <div className="vc-exophase-stat-item">
                    <span className="vc-exophase-stat-label">Unlocked</span>
                    <span className="vc-exophase-stat-value">{totalUnlocked}</span>
                </div>
                {completion !== undefined && (
                    <div className="vc-exophase-stat-item">
                        <span className="vc-exophase-stat-label">Avg. Completion</span>
                        <span className="vc-exophase-stat-value">{completion}%</span>
                    </div>
                )}
                {totalPlaytime !== undefined && (
                    <div className="vc-exophase-stat-item">
                        <span className="vc-exophase-stat-label">Playtime</span>
                        <span className="vc-exophase-stat-value">{totalPlaytime} hrs</span>
                    </div>
                )}
            </div>

            <ExophaseSubTabs
                platforms={platforms}
                activePlatform={activePlatform}
                onSelect={setActivePlatform}
            />

            {achievements.length === 0 ? (
                <p className="vc-exophase-meta">
                    No {tabLabel.toLowerCase()} found{activePlatform !== "All" ? ` for ${activePlatform}` : ""}.
                </p>
            ) : activePlatform === "All" ? (
                <div className="vc-exophase-all-tab">
                    <div className="vc-exophase-section-header">
                        {LATEST_ACHIEVEMENT_COUNT} Latest {tabLabel}
                    </div>
                    <div className="vc-exophase-badge-grid vc-exophase-latest-grid">
                        {latestAchievements.map((achievement, idx) => {
                            const name = achievement.name ?? achievement.title ?? "Achievement";
                            const game = achievement.game_title ?? achievement.game ?? "Game";
                            const icon = achievement.icon_url ?? achievement.icon;
                            const time = formatTime(achievement.earned_at ?? achievement.unlocked_at);
                            const tooltipText = `${game}: ${name} (${time})`;
                            const url = achievement.url ?? achievement.link;

                            return (
                                <Tooltip key={achievement.id ?? idx} text={tooltipText}>
                                    {tooltipProps => (
                                        <img
                                            {...tooltipProps}
                                            src={icon}
                                            alt={tooltipText}
                                            className="vc-exophase-badge-item"
                                            onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
                                        />
                                    )}
                                </Tooltip>
                            );
                        })}
                    </div>

                    {Object.entries(groupedByPlatform).map(([platformName, gamesMap]) => {
                        const platformInfo = summary?.platforms?.find(p => p.platform.toLowerCase() === platformName.toLowerCase());
                        const platformUsername = platformInfo?.platform_username || username;
                        const platformUrl = summary?.profile_url
                            ? `${summary.profile_url}#${platformName.toLowerCase()}`
                            : getExophaseProfileUrl(username);

                        return (
                            <div key={platformName} className="vc-exophase-platform-block">
                                <a
                                    href={platformUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="vc-exophase-connection-card"
                                >
                                    <div className="vc-exophase-connection-info">
                                        <span className="vc-exophase-connection-name">{platformName}</span>
                                        <span className="vc-exophase-connection-user">{platformUsername}</span>
                                    </div>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                                    </svg>
                                </a>

                                {Object.entries(gamesMap).map(([gameTitle, gameAchievements]) => (
                                    <div key={gameTitle} className="vc-exophase-game-group">
                                        <div className="vc-exophase-game-header">
                                            {gameTitle}
                                            <span className="vc-exophase-game-count">({gameAchievements.length})</span>
                                        </div>

                                        <div className="vc-exophase-badge-grid">
                                            {gameAchievements.map((achievement, idx) => {
                                                const name = achievement.name ?? achievement.title ?? "Achievement";
                                                const icon = achievement.icon_url ?? achievement.icon;
                                                const time = formatTime(achievement.earned_at ?? achievement.unlocked_at);
                                                const tooltipText = `${name} • Unlocked ${time}`;
                                                const url = achievement.url ?? achievement.link;

                                                return (
                                                    <Tooltip key={achievement.id ?? idx} text={tooltipText}>
                                                        {tooltipProps => (
                                                            <img
                                                                {...tooltipProps}
                                                                src={icon}
                                                                alt={tooltipText}
                                                                className="vc-exophase-badge-item"
                                                                onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
                                                            />
                                                        )}
                                                    </Tooltip>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="vc-exophase-list-detailed">
                    {achievements.map((achievement, idx) => (
                        <ExophaseCard key={achievement.id ?? idx} achievement={achievement} />
                    ))}
                </div>
            )}
        </div>
    );
}
