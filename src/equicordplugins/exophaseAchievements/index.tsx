import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
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
        description: "Your Exophase username. Only used to show your own achievements on your own profile.",
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

function getTabLabel() {
    return settings.store.tabName || DEFAULT_TAB_NAME;
}

function isOwnProfile(userId?: string) {
    return !!userId && userId === UserStore.getCurrentUser()?.id;
}

export default definePlugin({
    name: "ExophaseAchievements",
    description: "Shows your Exophase game achievements on your own Discord profile.",
    tags: ["Activity", "Fun"],
    authors: [{ name: "Aaronateataco", id: 0n }],
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

    getTabLabel,

    // The tab only ever shows the locally configured Exophase account, so it
    // only makes sense to show it on your own profile - showing your own
    // achievements while looking at someone else's profile would be
    // misleading. This also means nothing is fetched or shown until a
    // username has actually been configured in settings.
    shouldShowExophaseTab(userId?: string) {
        return isOwnProfile(userId) && !!settings.store.exophaseUsername;
    },

    renderProfilePopoutCard: ErrorBoundary.wrap((props: { user: User; }) => {
        if (!isOwnProfile(props.user.id) || !settings.store.exophaseUsername) return null;
        return <ProfilePopoutComponent user={props.user} />;
    }, { noop: true }),

    renderExophaseTab: ErrorBoundary.wrap((props: { user: User; }) => {
        return <ProfileTabComponent user={props.user} tabLabel={getTabLabel()} />;
    }, { noop: true }),
});
