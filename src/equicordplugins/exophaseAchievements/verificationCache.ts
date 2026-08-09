import { Logger } from "@utils/Logger";

import { fetchUserVerification, PublicUserVerification } from "./verifyApi";

const logger = new Logger("ExophaseAchievements");

// The two places this plugin renders things on a profile. These are the same
// strings the ExophaseVerify backend stores in a verified user's
// `hiddenSections` array, so a verified user can choose to hide either one
// from *other* people's view without unverifying entirely.
export const SECTION_IDS = {
    TAB: "tab",
    POPOUT: "popout",
} as const;

// --- Verification cache -----------------------------------------------
//
// GET /api/users/:discordId is how we find out whether *someone else* has
// verified an Exophase account, and if so what it is / what they've chosen
// to hide. That's an async network call, but the tab-bar patch in index.tsx
// needs a synchronous yes/no to decide whether to inject the tab button at
// all - so we keep a small in-memory cache here. A cache miss triggers a
// background fetch (so the *next* render of the tab bar, e.g. re-opening the
// profile, can show it) and returns "don't show it yet" in the meantime. The
// popout card doesn't have this constraint (it's a real async component) and
// warms the same cache as a side effect, so in practice the tab and popout
// usually end up in sync after the first render.
//
// This lives in its own module (not index.tsx) deliberately: components
// import it, and index.tsx also imports the components, so putting it in
// index.tsx creates a real circular-import cycle. As long as everything only
// *reads* these exports lazily (inside functions, not at module top level)
// that cycle is technically fine in ESM - but keeping it out of index.tsx
// avoids relying on that subtlety.

interface CachedVerification {
    verified: boolean;
    exophaseUsername: string;
    hiddenSections: string[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const verificationCache = new Map<string, CachedVerification | null>();
const cacheTimestamps = new Map<string, number>();
const inFlightFetches = new Map<string, Promise<CachedVerification | null>>();

function toCacheEntry(info: PublicUserVerification | null): CachedVerification | null {
    if (!info) return null;
    return {
        verified: info.verified,
        exophaseUsername: info.exophaseUsername,
        hiddenSections: info.hiddenSections ?? [],
    };
}

/** Synchronous cache read. Returns undefined if nothing has been fetched (or fetched but stale) yet. */
export function getCachedVerification(userId: string): CachedVerification | null | undefined {
    const fetchedAt = cacheTimestamps.get(userId);
    if (fetchedAt !== undefined && Date.now() - fetchedAt > CACHE_TTL_MS) {
        verificationCache.delete(userId);
        cacheTimestamps.delete(userId);
        return undefined;
    }
    return verificationCache.get(userId);
}

/** Populates (or refreshes) the cache for a user. Safe to call repeatedly - concurrent calls share one request. */
export function ensureVerificationCached(userId: string): Promise<CachedVerification | null> {
    const inFlight = inFlightFetches.get(userId);
    if (inFlight) return inFlight;

    const promise = fetchUserVerification(userId)
        .then(info => {
            const entry = toCacheEntry(info);
            verificationCache.set(userId, entry);
            cacheTimestamps.set(userId, Date.now());
            return entry;
        })
        .catch(error => {
            logger.error("Failed to fetch Exophase verification for", userId, error);
            return null;
        })
        .finally(() => {
            inFlightFetches.delete(userId);
        });

    inFlightFetches.set(userId, promise);
    return promise;
}
