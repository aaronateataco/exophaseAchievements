import { React, Tooltip, moment } from "@webpack/common";

interface ExophaseCardProps {
    game: any;
}

function formatUnlockedTime(rawDate?: string | null) {
    if (!rawDate) return { relative: "Unlocked", full: "" };
    try {
        const d = moment(rawDate);
        if (!d.isValid()) return { relative: rawDate, full: rawDate };
        return {
            relative: d.fromNow(),
            full: d.format("MMMM D, YYYY [at] h:mm A")
        };
    } catch {
        return { relative: rawDate, full: rawDate };
    }
}

export function ExophaseCard({ game }: ExophaseCardProps) {
    const achievementName = game.name || game.title || "Achievement";
    const gameTitle = game.game_title || game.game || "";
    const imageUrl = game.icon_url || game.icon || game.image || game.thumb || game.cover;
    const url = game.url || game.link || "https://www.exophase.com";
    const rarity = game.rarity_percent ?? game.rarity;

    const timeInfo = formatUnlockedTime(game.earned_at || game.unlocked_at);
    const handleClick = () => window.open(url, "_blank", "noopener,noreferrer");

    return (
        <div className="vc-exophase-card vc-exophase-card-detailed" onClick={handleClick}>
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={achievementName}
                    className="vc-exophase-card-icon-detailed"
                />
            )}
            <div className="vc-exophase-card-content">
                {gameTitle && (
                    <span className="vc-exophase-subtitle vc-text-line-clamp-1">
                        {gameTitle}
                    </span>
                )}
                <p className="vc-exophase-title vc-text-line-clamp-1">
                    {achievementName}
                </p>
                {game.description && (
                    <p className="vc-exophase-description vc-text-line-clamp-2">
                        {game.description}
                    </p>
                )}

                <div className="vc-exophase-card-footer">
                    <Tooltip text={timeInfo.full}>
                        {tooltipProps => (
                            <span {...tooltipProps} className="vc-exophase-time">
                                Unlocked {timeInfo.relative}
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