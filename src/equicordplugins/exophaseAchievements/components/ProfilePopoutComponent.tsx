import { Paragraph } from "@components/Paragraph";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { User } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { React, Tooltip, useEffect, useState } from "@webpack/common";

import { fetchSummary, getExophaseProfileUrl } from "../exophaseApi";
import { settings } from "../index";
import { ExophaseSummary } from "../types";

const logger = new Logger("ExophaseAchievements");

const ProfileCardClasses = findCssClassesLazy("cardsList", "firstCardContainer", "card", "container");
const ProfileCardContainerClasses = findCssClassesLazy("innerContainer", "icons", "icon", "breadcrumb");
const ProfileCardOverlayClasses = findCssClassesLazy("overlay");

const MAX_POPOUT_BADGES = 20;

interface ProfilePopoutProps {
    user: User;
}

export function ProfilePopoutComponent({ user }: ProfilePopoutProps) {
    const [summary, setSummary] = useState<ExophaseSummary | null>(null);
    const username = settings.store.exophaseUsername;

    useEffect(() => {
        if (!username) {
            setSummary(null);
            return;
        }

        const controller = new AbortController();
        fetchSummary(username, controller.signal).then(data => {
            if (!data) logger.warn("No summary returned for", username, "- popout card will stay hidden.");
            setSummary(data);
        });
        return () => controller.abort();
    }, [user.id, username]);

    if (!summary?.recent_achievements?.length) return null;

    const achievements = summary.recent_achievements.slice(0, MAX_POPOUT_BADGES);
    const totalGames = summary.platforms?.reduce((total, platform) => total + (platform.games_owned ?? 0), 0) ?? 0;

    return (
        <section className={ProfileCardClasses.container}>
            <ul className={ProfileCardClasses.cardsList} tabIndex={-1}>
                <li className={ProfileCardClasses.firstCardContainer}>
                    <div
                        className={classes(
                            ProfileCardOverlayClasses.overlay,
                            ProfileCardContainerClasses.innerContainer,
                            ProfileCardClasses.card,
                            "vc-exophase-popout"
                        )}
                    >
                        <Paragraph size="xs" weight="medium">
                            Exophase Achievements{totalGames > 0 && ` (${totalGames} Games)`}
                        </Paragraph>

                        <div className="vc-exophase-mini-badges">
                            {achievements.map((achievement, index) => {
                                const name = achievement.name ?? achievement.title ?? "Achievement";
                                const game = achievement.game_title ?? achievement.game ?? "Game";
                                const icon = achievement.icon_url ?? achievement.icon;
                                const url = achievement.url ?? achievement.link ?? getExophaseProfileUrl(summary.username);
                                const tooltipText = `${game}: ${name}`;

                                return (
                                    <Tooltip key={achievement.id ?? index} text={tooltipText}>
                                        {tooltipProps => (
                                            <img
                                                {...tooltipProps}
                                                src={icon}
                                                alt={tooltipText}
                                                className="vc-exophase-badge-item"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    window.open(url, "_blank", "noopener,noreferrer");
                                                }}
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
