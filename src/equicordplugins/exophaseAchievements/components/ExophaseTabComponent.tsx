import { React, useEffect, useState } from "@webpack/common";
import { User } from "@vencord/discord-types";
import { settings } from "../index";
import { ExophaseCard } from "./ExophaseCard";
import { ExophaseSubTabs } from "./ExophaseSubTabs";

interface ProfileTabProps {
    user?: User;
    displayProfile?: any;
}

interface AchievementStats {
    total_unlocked?: number;
    total_achievements?: number;
    total_games?: number;
    total_points?: number;
}

export function ProfileTabComponent({ user }: ProfileTabProps) {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [stats, setStats] = useState<AchievementStats | null>(null);
    const [platforms, setPlatforms] = useState<string[]>(["All"]);
    const [activePlatform, setActivePlatform] = useState<string>("All");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const username = settings.store.exophaseUsername || "FoxStorm1";
        setLoading(true);
        setError(null);

        const platformParam = activePlatform === "All" ? "" : `?platform=${encodeURIComponent(activePlatform.toLowerCase())}`;

        fetch(`https://exophaseapi.vercel.app/api/v1/user/${encodeURIComponent(username)}/achievements${platformParam}`)
            .then(async res => {
                if (!res.ok) {
                    throw new Error(`Server returned HTTP ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                const list = Array.isArray(data) ? data : (data.achievements || []);
                setAchievements(list);

                if (data.stats) {
                    setStats(data.stats);
                }

                if (activePlatform === "All") {
                    const uniquePlatforms = ["All", ...Array.from(new Set(list.map((a: any) => a.platform).filter(Boolean))) as string[]];
                    setPlatforms(uniquePlatforms);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("[Exophase Plugin] Big Profile Fetch Error:", err);
                setError(err.message || "Failed to load achievements");
                setLoading(false);
            });
    }, [activePlatform, user?.id]);

    if (loading && !stats) {
        return (
            <div className="vc-exophase-container">
                <p className="vc-exophase-meta vc-text-base">Loading achievements...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="vc-exophase-container">
                <p className="vc-exophase-meta vc-text-base" style={{ color: "var(--text-danger)" }}>
                    {error}
                </p>
            </div>
        );
    }

    const totalUnlocked = stats?.total_unlocked ?? stats?.total_achievements ?? 0;

    return (
        <div className="vc-exophase-container">
            {stats && (
                <div style={{ display: "flex", gap: 16, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                    <div>
                        <p className="vc-exophase-meta vc-text-base">Unlocked</p>
                        <p className="vc-exophase-title vc-text-base">{totalUnlocked}</p>
                    </div>
                    {stats.total_games !== undefined && (
                        <div>
                            <p className="vc-exophase-meta vc-text-base">Games</p>
                            <p className="vc-exophase-title vc-text-base">{stats.total_games}</p>
                        </div>
                    )}
                </div>
            )}

            <ExophaseSubTabs
                platforms={platforms}
                activePlatform={activePlatform}
                onSelect={setActivePlatform}
            />

            {achievements.length === 0 ? (
                <p className="vc-exophase-meta vc-text-base">No achievements found.</p>
            ) : (
                achievements.map((item, idx) => (
                    <ExophaseCard key={item.id || idx} game={item} />
                ))
            )}
        </div>
    );
}