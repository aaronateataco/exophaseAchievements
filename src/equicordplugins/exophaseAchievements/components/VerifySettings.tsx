import { Logger } from "@utils/Logger";
import { Button, React, TextInput, useEffect, useState, UserStore } from "@webpack/common";

import { settings } from "../index";
import { SECTION_IDS } from "../verificationCache";
import { clearLocalVerification, getLocalVerification, LocalVerification, setLocalVerification } from "../verifyStore";
import { fetchUserVerification, startVerifyFlow, updateHiddenSections, VerifyPollResult } from "../verifyApi";

const logger = new Logger("ExophaseAchievements");

const SECTION_LABELS: Record<string, string> = {
    [SECTION_IDS.TAB]: "Achievements tab on my full profile",
    [SECTION_IDS.POPOUT]: "Recent achievements card on my profile popout",
};

type FlowState =
    | { phase: "idle"; }
    | { phase: "pending"; }
    | { phase: "failed"; result: VerifyPollResult; }
    | { phase: "timeout"; }
    | { phase: "error"; message: string; };

export function VerifySettings() {
    const [local, setLocal] = useState<LocalVerification | null>(null);
    const [loadingLocal, setLoadingLocal] = useState(true);
    const [flow, setFlow] = useState<FlowState>({ phase: "idle" });
    const [hiddenSections, setHiddenSections] = useState<string[]>([]);
    const [savingSection, setSavingSection] = useState<string | null>(null);
    // Auth needs somewhere for people to actually type their username - it
    // used to only read settings.store.exophaseUsername, which meant nothing
    // happened if that separate field above hadn't already been filled in.
    // This mirrors that setting (and writes back to it on every keystroke,
    // same as a normal settings TextInput would) so verifying is self
    // contained: type a username here, hit verify, done.
    const [usernameInput, setUsernameInput] = useState(settings.store.exophaseUsername ?? "");

    const handleUsernameChange = (value: string) => {
        setUsernameInput(value);
        settings.store.exophaseUsername = value;
    };

    // Load whatever we already verified in a previous session.
    useEffect(() => {
        let cancelled = false;
        getLocalVerification().then(stored => {
            if (cancelled) return;
            setLocal(stored);
            setLoadingLocal(false);
        });
        return () => { cancelled = true; };
    }, []);

    // Once we know who we are, pull the current hiddenSections from the
    // backend (source of truth) rather than trusting anything cached locally.
    useEffect(() => {
        if (!local) {
            setHiddenSections([]);
            return;
        }

        const controller = new AbortController();
        fetchUserVerification(local.discordId, controller.signal)
            .then(info => {
                if (info) setHiddenSections(info.hiddenSections ?? []);
            })
            .catch(error => {
                if ((error as Error)?.name === "AbortError") return;
                logger.error("Failed to load hidden section settings:", error);
            });
        return () => controller.abort();
    }, [local?.discordId]);

    const handleVerify = () => {
        const username = usernameInput.trim();
        if (!username) {
            setFlow({ phase: "error", message: "Enter your Exophase username first." });
            return;
        }
        settings.store.exophaseUsername = username;

        setFlow({ phase: "pending" });

        startVerifyFlow(username, {
            onPending: () => setFlow(prev => (prev.phase === "pending" ? prev : { phase: "pending" })),
            onSuccess: async result => {
                const currentId = UserStore.getCurrentUser()?.id;
                if (!currentId || !result.settingsToken) {
                    setFlow({ phase: "error", message: "Verification succeeded but local Discord user info wasn't available." });
                    return;
                }

                const record: LocalVerification = {
                    discordId: currentId,
                    exophaseUsername: username,
                    settingsToken: result.settingsToken,
                    matchedPlatforms: result.matchedPlatforms ?? [],
                    verifiedAt: Date.now(),
                };

                await setLocalVerification(record);
                setLocal(record);
                setFlow({ phase: "idle" });
            },
            onFailed: result => setFlow({ phase: "failed", result }),
            onTimeout: () => setFlow({ phase: "timeout" }),
            onError: error => {
                logger.error("Verify flow failed:", error);
                setFlow({ phase: "error", message: error instanceof Error ? error.message : String(error) });
            },
        });
    };

    const handleClear = async () => {
        await clearLocalVerification();
        setLocal(null);
        setHiddenSections([]);
        setFlow({ phase: "idle" });
    };

    const toggleSection = async (sectionId: string) => {
        if (!local) return;

        const next = hiddenSections.includes(sectionId)
            ? hiddenSections.filter(id => id !== sectionId)
            : [...hiddenSections, sectionId];

        const previous = hiddenSections;
        setHiddenSections(next);
        setSavingSection(sectionId);

        try {
            await updateHiddenSections(local.discordId, local.settingsToken, next);
        } catch (error) {
            logger.error("Failed to save hidden sections:", error);
            setHiddenSections(previous);
            setFlow({ phase: "error", message: "Couldn't save that change. Your verification may need to be redone (settingsToken revoked)." });
        } finally {
            setSavingSection(null);
        }
    };

    if (loadingLocal) {
        return <div className="vc-exophase-verify-panel vc-exophase-meta">Loading verification status...</div>;
    }

    return (
        <div className="vc-exophase-verify-panel">
            <div className="vc-exophase-verify-username-row">
                <label className="vc-exophase-verify-username-label" htmlFor="vc-exophase-username-input">
                    Exophase username
                </label>
                <TextInput
                    id="vc-exophase-username-input"
                    value={usernameInput}
                    onChange={handleUsernameChange}
                    placeholder="e.g. FoxStorm1"
                />
            </div>

            {local ? (
                <>
                    <p className="vc-exophase-verify-status vc-exophase-verify-status-ok">
                        Verified as <strong>{local.exophaseUsername}</strong>
                        {local.matchedPlatforms.length > 0 && ` (matched via ${local.matchedPlatforms.join(", ")})`}.
                        Your achievements can now show on your profile for other people running this plugin.
                    </p>

                    <div className="vc-exophase-verify-sections">
                        {Object.entries(SECTION_LABELS).map(([id, label]) => (
                            <label key={id} className="vc-exophase-verify-section-toggle">
                                <input
                                    type="checkbox"
                                    checked={!hiddenSections.includes(id)}
                                    disabled={savingSection === id}
                                    onChange={() => toggleSection(id)}
                                />
                                Show {label} to others
                            </label>
                        ))}
                    </div>

                    <div className="vc-exophase-verify-actions">
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={handleVerify}
                            disabled={flow.phase === "pending" || !usernameInput.trim()}
                        >
                            {flow.phase === "pending" ? "Waiting for Discord..." : "Re-verify"}
                        </Button>
                        <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={handleClear}>
                            Clear verification
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <p className="vc-exophase-verify-status">
                        Verifying proves this Exophase account is actually yours (by matching your public Steam/Epic
                        Discord connections against it), so your achievements can appear on your profile for other
                        people running this plugin - not just for you.
                    </p>
                    <Button
                        size={Button.Sizes.SMALL}
                        onClick={handleVerify}
                        disabled={flow.phase === "pending" || !usernameInput.trim()}
                    >
                        {flow.phase === "pending" ? "Waiting for Discord..." : "Verify with Discord"}
                    </Button>
                </>
            )}

            {flow.phase === "pending" && (
                <p className="vc-exophase-verify-meta">
                    A browser tab just opened - approve the request there, then come back here. This updates
                    automatically every couple seconds.
                </p>
            )}
            {flow.phase === "failed" && (
                <p className="vc-exophase-verify-status vc-exophase-verify-status-error">
                    {flow.result.reason ?? "Verification failed."}
                </p>
            )}
            {flow.phase === "timeout" && (
                <p className="vc-exophase-verify-status vc-exophase-verify-status-error">
                    Timed out waiting on Discord. Please try again.
                </p>
            )}
            {flow.phase === "error" && (
                <p className="vc-exophase-verify-status vc-exophase-verify-status-error">{flow.message}</p>
            )}
        </div>
    );
}
