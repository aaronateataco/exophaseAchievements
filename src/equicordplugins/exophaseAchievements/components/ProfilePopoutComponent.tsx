import { Paragraph } from "@components/Paragraph";
import { classes } from "@utils/misc";
import { User } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Clickable, React, Tooltip, useEffect, useState } from "@webpack/common";
import { settings } from "../index";

const ProfileCardClasses = findCssClassesLazy("cardsList", "firstCardContainer", "card", "container");
const ProfileCardContainerClasses = findCssClassesLazy("innerContainer", "icons", "icon", "breadcrumb");
const ProfileCardOverlayClasses = findCssClassesLazy("overlay");

interface ProfilePopoutProps {
    userId?: string;
    user?: User;
    isSideBar?: boolean;
    displayProfile?: any;
}

interface Achievement {
    id?: number | string;
    name?: string;
    title?: string;
    game_title?: string;
    description?: string;
    icon_url?: string;
    icon?: string;
    url?: string;
}

interface PlatformData {
    games_owned?: number;
}

interface SummaryData {
    username: string;
    stats?: {
        total_achievements?: number;
        total_playtime_hours?: number;
        overall_completion_percentage?: number;
    };
    platforms?: PlatformData[];
    recent_achievements?: Achievement[];
}

export function ProfilePopoutComponent({ userId, user, isSideBar = false }: ProfilePopoutProps) {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const username = settings.store.exophaseUsername || "FoxStorm1";

        fetch(`https://exophaseapi.vercel.app/api/v1/user/${encodeURIComponent(username)}/summary`)
            .then(async res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setSummary(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("[Exophase Plugin] Summary fetch error:", err);
                setLoading(false);
            });
    }, [userId, user?.id]);

    if (loading || !summary || !summary.recent_achievements?.length) return null;

    const achievements = summary.recent_achievements.slice(0, 5);

    // Calculate total games across all connected platforms
    const totalGames = summary.platforms?.reduce((acc, p) => acc + (p.games_owned || 0), 0) ?? 0;

    return (
        <section className={ProfileCardClasses.container}>
            <ul className={ProfileCardClasses.cardsList} tabIndex={-1}>
                <li className={ProfileCardClasses.firstCardContainer}>
                    <div
                        className={classes(ProfileCardOverlayClasses.overlay, ProfileCardContainerClasses.innerContainer, ProfileCardClasses.card)}
                        style={{ flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 12 }}
                    >
                        <Paragraph size={isSideBar ? "sm" : "xs"} weight="medium">
                            Exophase Achievements {totalGames > 0 ? `(${totalGames} Games)` : ""}
                        </Paragraph>

                        <div className="vc-exophase-mini-badges">
                            {achievements.map((item, idx) => {
                                const achievementName = item.name || item.title || "Achievement";
                                const gameName = item.game_title || "Game";
                                const tooltipText = `${gameName}: ${achievementName}`;
                                const iconUrl = item.icon_url || item.icon;
                                const targetUrl = item.url || `https://www.exophase.com/user/${summary.username}`;

                                const handleIconClick = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    window.open(targetUrl, "_blank", "noopener,noreferrer");
                                };

                                return (
                                    <Tooltip key={item.id || idx} text={tooltipText}>
                                        {tooltipProps => (
                                            <img
                                                {...tooltipProps}
                                                src={iconUrl}
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
                </li>
            </ul>
        </section>
    );
}