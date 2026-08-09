import { moment, React, Tooltip } from "@webpack/common";

import { ExophaseAchievement } from "../types";

interface ExophaseCardProps {
    achievement: ExophaseAchievement;
}

function formatUnlockedTime(rawDate?: string | null) {
    if (!rawDate) return { relative: "Unlocked", full: "" };

    const parsed = moment(rawDate);
    if (!parsed.isValid()) return { relative: rawDate, full: rawDate };

    return {
        relative: parsed.fromNow(),
        full: parsed.format("MMMM D, YYYY [at] h:mm A"),
    };
}

export function ExophaseCard({ achievement }: ExophaseCardProps) {
    const name = achievement.name ?? achievement.title ?? "Achievement";
    const gameTitle = achievement.game_title ?? achievement.game ?? "";
    const imageUrl = achievement.icon_url ?? achievement.icon;
    const url = achievement.url ?? achievement.link ?? "https://www.exophase.com";
    const rarity = achievement.rarity_percent ?? achievement.rarity;
    const time = formatUnlockedTime(achievement.earned_at ?? achievement.unlocked_at);

    return (
        <div
            className="vc-exophase-card vc-exophase-card-detailed"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        >
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={name}
                    className="vc-exophase-card-icon-detailed"
                />
            )}
            <div className="vc-exophase-card-content">
                {gameTitle && (
                    <span className="vc-exophase-subtitle">
                        {gameTitle}
                    </span>
                )}
                <p className="vc-exophase-title">
                    {name}
                </p>
                {achievement.description && (
                    <p className="vc-exophase-description">
                        {achievement.description}
                    </p>
                )}

                <div className="vc-exophase-card-footer">
                    <Tooltip text={time.full}>
                        {tooltipProps => (
                            <span {...tooltipProps} className="vc-exophase-time">
                                Unlocked {time.relative}
                            </span>
                        )}
                    </Tooltip>
                    {rarity !== undefined && (
                        <span className="vc-exophase-rarity-pill">
                            {rarity}% Rarity
                        </span>
                    )}
                </div>
            </div>

            <svg
                className="vc-exophase-icon"
                aria-hidden="true"
                role="img"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
            >
                <path
                    fill="currentColor"
                    d="M8 5a1 1 0 0 0 0 2h7.59L5.29 17.3a1 1 0 1 0 1.42 1.4L17 8.42V16a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1H8Z"
                />
            </svg>
        </div>
    );
}
