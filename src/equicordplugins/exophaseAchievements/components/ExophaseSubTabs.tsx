/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

import { SubTabsProps } from "../types";

export function ExophaseSubTabs({ platforms, activePlatform, onSelect }: SubTabsProps) {
    if (platforms.length <= 1) return null;

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY === 0) return;
        e.currentTarget.scrollLeft += e.deltaY;
    };

    return (
        <div className="vc-exophase-subtabs" onWheel={handleWheel}>
            {platforms.map(platform => (
                <div
                    key={platform}
                    onClick={() => onSelect(platform)}
                    className={`vc-exophase-subtab ${activePlatform === platform ? "vc-exophase-subtab-active" : ""}`}
                >
                    {platform}
                </div>
            ))}
        </div>
    );
}
