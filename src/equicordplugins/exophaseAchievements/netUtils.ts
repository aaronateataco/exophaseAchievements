/**
 * Discord's client ships a whitelist-based Content-Security-Policy. A `fetch()`
 * to a host that isn't whitelisted (in Vencord's `customCspRules` / core
 * `CspPolicies`) gets rejected by the browser *before* any request is even
 * sent - so it fails as a plain `TypeError: Failed to fetch` almost instantly,
 * which is easy to mistake for "the request is broken" or "it gave up too
 * soon" rather than "this host was never allowed to be contacted at all".
 *
 * This tries to tell that case apart from a normal network failure (offline,
 * DNS, actual timeout, server down) so the UI/logs can say something useful
 * instead of a bare "Failed to fetch".
 */
export function isLikelyCspBlock(error: unknown, startedAt: number): boolean {
    return (
        error instanceof TypeError &&
        /failed to fetch/i.test(error.message) &&
        // A CSP rejection happens synchronously-ish, well before any real
        // request could plausibly have completed or timed out.
        Date.now() - startedAt < 500
    );
}

export function describeFetchFailure(error: unknown, startedAt: number, host: string): string {
    if (isLikelyCspBlock(error, startedAt)) {
        return (
            `Request to ${host} was blocked instantly, most likely by Discord's Content-Security-Policy ` +
            `rather than an actual network problem. If you're on Vencord Desktop, add "${host}" with the ` +
            `"connect-src" directive under Settings > Vencord Settings > (advanced) custom CSP rules ` +
            `(stored in customCspRules in nativeSettings.json), then restart Discord.`
        );
    }
    return error instanceof Error ? error.message : String(error);
}
