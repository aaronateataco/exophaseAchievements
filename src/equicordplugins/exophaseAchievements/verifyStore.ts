import * as DataStore from "@api/DataStore";

const LOCAL_VERIFICATION_KEY = "ExophaseAchievements_localVerification";

/**
 * What we keep client-side after a successful verify. The settingsToken is
 * the only credential needed to update hiddenSections later (Bearer auth on
 * PUT /api/users/:discordId/settings) - it's a signed, 30-day token, not tied
 * to a session, so it's safe to persist via DataStore like any other plugin
 * data.
 */
export interface LocalVerification {
    discordId: string;
    exophaseUsername: string;
    settingsToken: string;
    matchedPlatforms: string[];
    verifiedAt: number;
}

export async function getLocalVerification(): Promise<LocalVerification | null> {
    const stored = await DataStore.get<LocalVerification>(LOCAL_VERIFICATION_KEY);
    return stored ?? null;
}

export async function setLocalVerification(record: LocalVerification): Promise<void> {
    await DataStore.set(LOCAL_VERIFICATION_KEY, record);
}

export async function clearLocalVerification(): Promise<void> {
    await DataStore.del(LOCAL_VERIFICATION_KEY);
}
