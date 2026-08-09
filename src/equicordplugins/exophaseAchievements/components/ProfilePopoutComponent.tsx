import { Tooltip, UserStore, useEffect, useState } from "@webpack/common";
import { User } from "@vencord/discord-types";

import { fetchAchievements, getExophaseProfileUrl, sortByRecency } from "../exophaseApi";
import { settings } from "../index";
import { ExophaseAchievement } from "../types";

export function ProfilePopoutComponent({ user }: { user: User; }) {
    const isOwnProfile = user?.id && user.id === UserStore.getCurrentUser()?.id;
    const username = settings.store.exophaseUsername;

    const [achievements, setAchievements] = useState<ExophaseAchievement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOwnProfile || !username) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);

        fetchAchievements(username, undefined, controller.signal)
            .then(data => {
                if (!controller.signal.aborted) {
                    const sorted = sortByRecency(data).slice(0, 10);
                    setAchievements(sorted);
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setAchievements([]);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [isOwnProfile, username]);

    if (!isOwnProfile || !username || loading || achievements.length === 0) {
        return null;
    }

    return (
        <div className="vc-exophase-popout">
            <div className="vc-exophase-section-header">Recent Achievements</div>
            <div className="vc-exophase-latest-grid">
                {achievements.map((ach, idx) => {
                    const title = ach.name || ach.title || "Achievement";
                    const game = ach.game_title || ach.game || "";
                    const icon = ach.icon_url || ach.icon;
                    const tooltipText = game ? `${title} (${game})` : title;
                    const targetUrl = ach.url || ach.link || getExophaseProfileUrl(username);

                    if (!icon) return null;

                    return (
                        <Tooltip text={tooltipText} key={ach.id ?? idx}>
                            {props => (
                                <a
                                    {...props}
                                    href={targetUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <img
                                        src={icon}
                                        alt={title}
                                        className="vc-exophase-badge-item"
                                    />
                                </a>
                            )}
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}