import { React } from "@webpack/common";

interface SubTabsProps {
    platforms: string[];
    activePlatform: string;
    onSelect: (platform: string) => void;
}

export function ExophaseSubTabs({ platforms, activePlatform, onSelect }: SubTabsProps) {
    if (platforms.length <= 1) return null;

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY === 0) return;
        e.currentTarget.scrollLeft += e.deltaY;
    };

    return (
        <div className="vc-exophase-subtabs" onWheel={handleWheel}>
            {platforms.map(platform => {
                const isActive = activePlatform === platform;
                return (
                    <div
                        key={platform}
                        onClick={() => onSelect(platform)}
                        className={`vc-exophase-subtab ${isActive ? "vc-exophase-subtab-active" : ""}`}
                    >
                        {platform}
                    </div>
                );
            })}
        </div>
    );
}