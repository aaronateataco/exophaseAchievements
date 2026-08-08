import { React, useEffect, useState, Tooltip, moment } from "@webpack/common";
import { User } from "@vencord/discord-types";
import { settings } from "../index";
import { ExophaseCard } from "./ExophaseCard";
import { ExophaseSubTabs } from "./ExophaseSubTabs";

interface ProfileTabProps {
    user?: User;
    displayProfile?: any;
}

type GroupedPlatformMap = Record<string, Record<string, any[]>>;

function formatTime(rawDate?: string | null) {
    if (!rawDate) return "Unlocked";
    try {
        const d = moment(rawDate);
        return d.isValid() ? d.fromNow() : rawDate;
    } catch {
        return rawDate;
    }
}

export function ProfileTabComponent({ user }: ProfileTabProps) {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [summary, setSummary] = useState<any | null>(null);
    const [platforms, setPlatforms] = useState<string[]>(["All"]);
    const [activePlatform, setActivePlatform] = useState<string>("All");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const username = settings.store.exophaseUsername || "FoxStorm1";

    useEffect(() => {
        setLoading(true);
        setError(null);

        const platformParam = activePlatform === "All" ? "" : `?platform=${encodeURIComponent(activePlatform.toLowerCase())}`;

        Promise.all([
            fetch(`https://exophaseapi.vercel.app/api/v1/user/${encodeURIComponent(username)}/achievements${platformParam}`).then(r => r.ok ? r.json() : null),
            fetch(`https://exophaseapi.vercel.app/api/v1/user/${encodeURIComponent(username)}/summary`).then(r => r.ok ? r.json() : null)
        ])
            .then(([achData, sumData]) => {
                const list = Array.isArray(achData) ? achData : (achData?.achievements || []);
                setAchievements(list);
                if (sumData) setSummary(sumData);

                if (activePlatform === "All") {
                    const uniquePlatforms = ["All", ...Array.from(new Set(list.map((a: any) => a.platform).filter(Boolean))) as string[]];
                    setPlatforms(uniquePlatforms);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("[Exophase Plugin] Tab Fetch Error:", err);
                setError("Failed to load achievements");
                setLoading(false);
            });
    }, [activePlatform, user?.id]);

    if (loading && !summary) {
        return (
            <div className="vc-exophase-container">
                <p className="vc-exophase-meta">Loading achievements...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="vc-exophase-container">
                <p className="vc-exophase-meta" style={{ color: "var(--text-danger)" }}>
                    {error}
                </p>
            </div>
        );
    }

    const totalUnlocked = summary?.stats?.total_achievements ?? achievements.length;
    const totalPlaytime = summary?.stats?.total_playtime_hours;
    const completion = summary?.stats?.overall_completion_percentage;

    const latest20 = achievements.slice(0, 20);

    const groupedByPlatform = achievements.reduce((acc: GroupedPlatformMap, ach: any) => {
        const plat = ach.platform || "Other";
        const game = ach.game_title || ach.game || "Unknown Game";
        if (!acc[plat]) acc[plat] = {};
        if (!acc[plat][game]) acc[plat][game] = [];
        acc[plat][game].push(ach);
        return acc;
    }, {});

    return (
        <div className="vc-exophase-container">
            {/* Stats Header */}
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

            {/* Subtab Navigation Pills */}
            <ExophaseSubTabs
                platforms={platforms}
                activePlatform={activePlatform}
                onSelect={setActivePlatform}
            />

            {/* Content Body */}
            {activePlatform === "All" ? (
                <div className="vc-exophase-all-tab">
                    {/* Top Section: 20 Latest Achievements */}
                    <div className="vc-exophase-section-header">
                        20 Latest Achievements
                    </div>
                    <div className="vc-exophase-badge-grid vc-exophase-latest-grid">
                        {latest20.map((item, idx) => {
                            const title = item.name || item.title || "Achievement";
                            const game = item.game_title || "Game";
                            const icon = item.icon_url || item.icon;
                            const time = formatTime(item.earned_at || item.unlocked_at);
                            const tooltipText = `${game}: ${title} (${time})`;

                            return (
                                <Tooltip key={item.id || idx} text={tooltipText}>
                                    {tooltipProps => (
                                        <img
                                            {...tooltipProps}
                                            src={icon}
                                            alt={tooltipText}
                                            className="vc-exophase-badge-item"
                                            onClick={() => item.url && window.open(item.url, "_blank")}
                                        />
                                    )}
                                </Tooltip>
                            );
                        })}
                    </div>

                    {/* Platforms Breakdown */}
                    {Object.entries(groupedByPlatform).map(([platformName, gamesObj]) => {
                        const gamesMap = gamesObj as Record<string, any[]>;
                        const platInfo = summary?.platforms?.find((p: any) => p.platform.toLowerCase() === platformName.toLowerCase());
                        const platUser = platInfo?.platform_username || username;
                        const platUrl = summary?.profile_url ? `${summary.profile_url}#${platformName.toLowerCase()}` : `https://www.exophase.com/user/${username}`;

                        return (
                            <div key={platformName} className="vc-exophase-platform-block">
                                {/* Discord Connection Style Card */}
                                <a
                                    href={platUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="vc-exophase-connection-card"
                                >
                                    <div className="vc-exophase-connection-info">
                                        <span className="vc-exophase-connection-name">{platformName}</span>
                                        <span className="vc-exophase-connection-user">{platUser}</span>
                                    </div>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                                    </svg>
                                </a>

                                {/* Games with Dividers & Badge Rows */}
                                {Object.entries(gamesMap).map(([gameTitle, gameAchList]) => {
                                    const achList = gameAchList as any[];

                                    return (
                                        <div key={gameTitle} className="vc-exophase-game-group">
                                            <div className="vc-exophase-game-header">
                                                {gameTitle}
                                                <span className="vc-exophase-game-count">({achList.length})</span>
                                            </div>

                                            <div className="vc-exophase-badge-grid">
                                                {achList.map((ach, idx) => {
                                                    const title = ach.name || ach.title || "Achievement";
                                                    const icon = ach.icon_url || ach.icon;
                                                    const time = formatTime(ach.earned_at || ach.unlocked_at);
                                                    const tooltipText = `${title} • Unlocked ${time}`;

                                                    return (
                                                        <Tooltip key={ach.id || idx} text={tooltipText}>
                                                            {tooltipProps => (
                                                                <img
                                                                    {...tooltipProps}
                                                                    src={icon}
                                                                    alt={tooltipText}
                                                                    className="vc-exophase-badge-item"
                                                                    onClick={() => ach.url && window.open(ach.url, "_blank")}
                                                                />
                                                            )}
                                                        </Tooltip>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Individual Platform Tab */
                <div className="vc-exophase-list-detailed">
                    {achievements.length === 0 ? (
                        <p className="vc-exophase-meta">No achievements found for {activePlatform}.</p>
                    ) : (
                        achievements.map((item, idx) => (
                            <ExophaseCard key={item.id || idx} game={item} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}