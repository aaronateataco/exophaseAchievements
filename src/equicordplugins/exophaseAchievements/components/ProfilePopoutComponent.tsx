/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { User } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { React, Tooltip, useEffect, UserStore,useState } from "@webpack/common";

import { fetchSummary, getExophaseProfileUrl, sortByRecency } from "../exophaseApi";
import { settings } from "../index";
import { ExophaseSummary } from "../types";
import { ensureVerificationCached, getCachedVerification, SECTION_IDS } from "../verificationCache";

const logger = new Logger("ExophaseAchievements");
const USERNAME_SETTING: "exophaseUsername"[] = ["exophaseUsername"];

const DMSideBarClasses = findCssClassesLazy("widgetPreviews");
const ProfileCardClasses = findCssClassesLazy("cardsList", "firstCardContainer", "card", "container");
const ProfileCardContainerClasses = findCssClassesLazy("innerContainer", "icons", "icon", "breadcrumb");
const ProfileCardOverlayClasses = findCssClassesLazy("overlay");

const MAX_POPOUT_BADGES = 20;

interface ProfilePopoutProps {
    user: User;
    isSideBar?: boolean;
}

export function ProfilePopoutComponent({ user, isSideBar = false }: ProfilePopoutProps) {
    const own = user.id === UserStore.getCurrentUser()?.id;
    const { exophaseUsername } = settings.use(USERNAME_SETTING);

    const [username, setUsername] = useState<string | null>(own ? (exophaseUsername || null) : null);
    const [hiddenSections, setHiddenSections] = useState<string[]>([]);
    const [summary, setSummary] = useState<ExophaseSummary | null>(null);

    // Resolve *whose* achievements to show: on your own profile that's just
    // the local setting. On anyone else's, it's whatever ExophaseVerify has
    // on file for them - which also doubles as proof the account is really
    // theirs, since it only gets set after a successful Discord/Exophase
    // connection match.
    useEffect(() => {
        if (own) {
            setUsername(exophaseUsername || null);
            setHiddenSections([]);
            return;
        }

        const cached = getCachedVerification(user.id);
        if (cached !== undefined) {
            setUsername(cached?.verified ? cached.exophaseUsername : null);
            setHiddenSections(cached?.hiddenSections ?? []);
            return;
        }

        let cancelled = false;
        ensureVerificationCached(user.id).then(info => {
            if (cancelled) return;
            setUsername(info?.verified ? info.exophaseUsername : null);
            setHiddenSections(info?.hiddenSections ?? []);
        });
        return () => { cancelled = true; };
    }, [user.id, own, exophaseUsername]);

    useEffect(() => {
        if (!username) {
            setSummary(null);
            return;
        }

        const controller = new AbortController();

        // The mini card only ever needs the last 20 achievements, and the
        // summary endpoint's `recent_achievements` field already gives us
        // exactly that, pre-sorted, in one lightweight request - no need to
        // pull every achievement across every platform (which is what was
        // making this card slow to appear or not show up at all).
        fetchSummary(username, controller.signal)
            .then(data => setSummary(data))
            .catch(error => {
                if ((error as Error)?.name === "AbortError") return;
                logger.error("Failed to fetch popout summary:", error);
            });

        return () => controller.abort();
    }, [user.id, username]);

    if (!username) return null;
    if (!own && hiddenSections.includes(SECTION_IDS.POPOUT)) return null;

    const badges = sortByRecency(summary?.recent_achievements ?? []).slice(0, MAX_POPOUT_BADGES);
    if (!badges.length) return null;

    const totalGames = summary?.platforms?.reduce((total, platform) => total + (platform.games_owned ?? 0), 0) ?? 0;

    const achievementsSection = (
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
                        <Paragraph size={isSideBar ? "sm" : "xs"} weight="medium">
                            Exophase Achievements{totalGames > 0 && ` (${totalGames} Games)`}
                        </Paragraph>

                        <div className="vc-exophase-mini-badges">
                            {badges.map((achievement, index) => {
                                const name = achievement.name ?? achievement.title ?? "Achievement";
                                const game = achievement.game_title ?? achievement.game ?? "Game";
                                const icon = achievement.icon_url ?? achievement.icon;
                                const url = achievement.url ?? achievement.link ?? getExophaseProfileUrl(summary?.username ?? username);
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

    return isSideBar
        ? <div className={DMSideBarClasses.widgetPreviews}>{achievementsSection}</div>
        : achievementsSection;
}
