/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { UserStore } from "@webpack/common";

import { ProfilePopoutComponent } from "./components/ProfilePopoutComponent";
import { ProfileTabComponent } from "./components/ProfileTabComponent";
import { VerifySettings } from "./components/VerifySettings";
import { ensureVerificationCached, getCachedVerification, SECTION_IDS } from "./verificationCache";

const TAB_SECTION_ID = "EXOPHASE";
const DEFAULT_TAB_NAME = "Achievements";
const logger = new Logger("ExophaseAchievements");

export const settings = definePluginSettings({
    exophaseUsername: {
        type: OptionType.STRING,
        description: "Your Exophase username. Used to show your own achievements on your own profile, and as the username submitted when you verify below.",
        default: "",
    },
    tabName: {
        type: OptionType.SELECT,
        description: "What to call the achievements tab on your full profile",
        options: [
            { label: "Achievements", value: "Achievements", default: true },
            { label: "Medals", value: "Medals" },
            { label: "Trophies", value: "Trophies" },
            { label: "Pins", value: "Pins" },
        ],
    },
    verify: {
        type: OptionType.COMPONENT,
        description: "Verify your Exophase account so your achievements can show up on your profile for other people too (not just you)",
        component: VerifySettings,
    },
});

function getTabLabel() {
    return settings.store.tabName || DEFAULT_TAB_NAME;
}

function isOwnProfile(userId?: string) {
    return !!userId && userId === UserStore.getCurrentUser()?.id;
}

export default definePlugin({
    name: "ExophaseAchievements",
    description: "Shows Exophase game achievements on Discord profiles - your own always, and other verified users' too.",
    tags: ["Activity", "Fun"],
    authors: [EquicordDevs.Aaronateataco],
    settings,

    patches: [
        // 1. Injects an achievements tab into the full profile modal's tab bar,
        // alongside the built-in "About Me" / "Mutual Servers" tabs.
        {
            find: "#{intl::USER_PROFILE_ACTIVITY}",
            replacement: {
                match: /(\i)\.id!==\i\?\.id&&\i&&\(.{0,300}\.MUTUAL_GUILDS\}\)\)(?=,(\i))/,
                replace: `$&,$self.shouldShowExophaseTab($1.id)&&$2.push({text:$self.getTabLabel(),section:"${TAB_SECTION_ID}"})`,
            }
        },
        // 2. Tells the profile modal what to render when that tab is selected.
        {
            find: ".WIDGETS?",
            replacement: {
                match: /(\i)===\i\.\i\.WISHLIST/,
                replace: `$1==="${TAB_SECTION_ID}"?$self.renderExophaseTab(arguments[0]):$&`,
            }
        },
        // 3. Adds a small "recent achievements" card to the profile popout (the
        // hover-card you get from clicking someone's avatar), next to Discord's
        // own connection/activity cards.
        {
            find: "UserProfilePopout",
            replacement: {
                match: /\{profileType:(\i)\.(\i)\.PANEL,children:\[/,
                replace: "{profileType:$1.$2.PANEL,children:[$self.renderProfilePopoutCard(arguments[0]),",
            }
        }
    ],

    // The tab-bar patch below needs a synchronous answer, so warm the
    // verification cache as soon as a profile is opened rather than on the
    // render that needs it.
    flux: {
        USER_PROFILE_MODAL_OPEN({ userId }: { userId: string; }) {
            ensureVerificationCached(userId);
        },
    },

    getTabLabel,

    // Own profile: gated purely on the local setting, same as before - no
    // network round trip needed to see your own stuff.
    // Someone else's profile: gated on the verification cache, since we can
    // only legitimately show achievements for people who've proven the
    // Exophase account is theirs via ExophaseVerify. A cache miss kicks off a
    // background fetch (see verificationCache.ts) and shows nothing this
    // time around.
    // NOTE: this runs *inline* inside Discord's own tab-bar render function
    // (see patch #1) - there is no ErrorBoundary around this call the way
    // there is for renderProfilePopoutCard/renderExophaseTab below, so an
    // uncaught throw here doesn't just blank out our own UI, it blows up
    // whatever Discord component is rendering the profile at the time. Keep
    // this bulletproof: always resolve to a boolean, never throw.
    shouldShowExophaseTab(userId?: string) {
        try {
            if (!userId) return false;

            if (isOwnProfile(userId)) {
                return !!settings.store.exophaseUsername;
            }

            const cached = getCachedVerification(userId);
            if (cached === undefined) {
                ensureVerificationCached(userId);
                return false;
            }

            return !!cached?.verified && !cached.hiddenSections.includes(SECTION_IDS.TAB);
        } catch (error) {
            logger.error("shouldShowExophaseTab threw, hiding tab for this render:", error);
            return false;
        }
    },

    renderProfilePopoutCard: ErrorBoundary.wrap((props: { user: User; }) => {
        return <ProfilePopoutComponent user={props.user} />;
    }, { noop: true }),

    renderExophaseTab: ErrorBoundary.wrap((props: { user: User; }) => {
        return <ProfileTabComponent user={props.user} tabLabel={getTabLabel()} />;
    }, { noop: true }),
});
