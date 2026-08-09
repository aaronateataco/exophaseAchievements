import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { UserStore } from "@webpack/common";

import { ProfilePopoutComponent } from "./components/ProfilePopoutComponent";
import { ProfileTabComponent } from "./components/ProfileTabComponent";

const TAB_SECTION_ID = "EXOPHASE";
const DEFAULT_TAB_NAME = "Achievements";

export const settings = definePluginSettings({
    exophaseUsername: {
        type: OptionType.STRING,
        description: "Your Exophase username. Used to show your own achievements on your own profile.",
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
});

export function getTabLabel() {
    return settings.store.tabName || DEFAULT_TAB_NAME;
}

function isOwnProfile(userId?: string) {
    return !!userId && userId === UserStore.getCurrentUser()?.id;
}

export default definePlugin({
    name: "ExophaseAchievements",
    // NOTE: verification (showing achievements on *other* people's profiles)
    // has been pulled out for now - this only ever shows your own achievements
    // on your own profile until that comes back.
    description: "Shows your Exophase game achievements on your own Discord profile.",
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
        // hover-card you get from clicking someone's avatar).
        //
        // This still injects at the *start* of that panel's children array,
        // same as before - there's no reliable, version-proof way from here
        // to splice in specifically "after About Me" by matching on the
        // minified source, since we can't see what that first child's own
        // source looks like at patch time. Instead, ProfilePopoutComponent
        // gives its card an explicit CSS `order` (see .vc-exophase-popout in
        // styles.css) so it visually sorts itself after Discord's own
        // (unordered, i.e. order:0) sections. Other plugins that also inject
        // unordered cards here will still land wherever the array puts them -
        // if "above other plugin buttons" doesn't hold on your setup, bump
        // that order value up or down to taste.
        {
            find: "UserProfilePopout",
            replacement: {
                match: /\{profileType:(\i)\.(\i)\.PANEL,children:\[/,
                replace: "{profileType:$1.$2.PANEL,children:[$self.renderProfilePopoutCard(arguments[0]),",
            }
        }
    ],

    getTabLabel,

    // Gated purely on the local setting - no verification, no network round
    // trip, and (for now) no achievements shown on anyone else's profile.
    // NOTE: this runs *inline* inside Discord's own tab-bar render function
    // (see patch #1) - there is no ErrorBoundary around this call the way
    // there is for renderProfilePopoutCard/renderExophaseTab below, so an
    // uncaught throw here doesn't just blank out our own UI, it blows up
    // whatever Discord component is rendering the profile at the time. Keep
    // this bulletproof: always resolve to a boolean, never throw.
    shouldShowExophaseTab(userId?: string) {
        try {
            return isOwnProfile(userId) && !!settings.store.exophaseUsername;
        } catch {
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
