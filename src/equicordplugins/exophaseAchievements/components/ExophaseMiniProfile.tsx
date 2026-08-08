import { React, Tooltip } from "@webpack/common";
import { useState, useEffect } from "react";
import { User } from "@vencord/discord-types";
import { settings } from "../index";

export interface ExophaseMiniProfileProps {
    userId?: string;
    user?: User;
    displayProfile?: any;
    isSideBar?: boolean;
}

interface Achievement {
    title: string;
    game_title?: string;
    game?: string;
    icon: string;
    url?: string;
}

interface SummaryData {
    username: string;
    stats?: {
        total_games?: number;
        total_unlocked?: number;
    };
    recent_achievements?: Achievement[];
}

export function ExophaseMiniProfile({ userId, user }: ExophaseMiniProfileProps) {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const targetUserId = userId || user?.id;

    useEffect(() => {
        const username = settings.store.exophaseUsername || "FoxStorm1";

        fetch(`https://exophaseapi.vercel.app/api/v1/user/${username}/summary`)
            .then(res => res.json())
            .then(data => setSummary(data))
            .catch(() => setSummary(null));
    }, [targetUserId]);

    if (!summary || !summary.recent_achievements?.length) return null;

    const achievements = summary.recent_achievements.slice(0, 5);
    const totalGames = summary.stats?.total_games ?? 0;

    return (
        <div className="vc-exophase-mini-container">
            <div className="vc-exophase-mini-header">
                Exophase Achievements {totalGames > 0 ? `(${totalGames} Games)` : ""}
            </div>

            <div className="vc-exophase-mini-badges">
                {achievements.map((item, idx) => {
                    const gameName = item.game_title || item.game || "Game";
                    const tooltipText = `${gameName}: ${item.title}`;
                    const targetUrl = item.url || `https://www.exophase.com/user/${summary.username}`;

                    const handleIconClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        window.open(targetUrl, "_blank", "noopener,noreferrer");
                    };

                    return (
                        <Tooltip key={idx} text={tooltipText}>
                            {tooltipProps => (
                                <img
                                    {...tooltipProps}
                                    src={item.icon}
                                    alt={tooltipText}
                                    className="vc-exophase-mini-badge-icon"
                                    onClick={handleIconClick}
                                />
                            )}
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}