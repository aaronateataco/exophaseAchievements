import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { Button, TextInput, useState } from "@webpack/common";

import { ProfilePopoutComponent } from "./components/ProfilePopoutComponent";
import { ProfileTabComponent } from "./components/ProfileTabComponent";

export const settings = definePluginSettings({
    exophaseUsername: {
        type: OptionType.STRING,
        description: "Set your Exophase username (Overrides auto-detection)",
        default: "",
    },
    usernameInput: {
        type: OptionType.CUSTOM,
        description: "Set your Exophase username",
        component: () => <UsernameInput />,
    }
});

function UsernameInput() {
    const [value, setValue] = useState(settings.store.exophaseUsername ?? "");

    return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <TextInput
                value={value}
                placeholder="Exophase username"
                onChange={setValue}
            />
            <Button onClick={() => {
                settings.store.exophaseUsername = value;
            }}>
                Submit
            </Button>
        </div>
    );
}

export default definePlugin({
    name: "ExophaseAchievements",
    description: "Displays achievements on Discord user profiles scraped from Exophase.",
    tags: ["Appearance", "Utility"],
    authors: [EquicordDevs.Aaronateataco],
    dependencies: ["ProfileCollectionsAPI"],
    settings,

    patches: [
        // 1. Injects "Exophase" into the Full Profile Tab Bar
        {
            find: "#{intl::USER_PROFILE_ACTIVITY}",
            replacement: {
                match: /(\i)\.id!==\i\?\.id&&\i&&\(.{0,300}\.MUTUAL_GUILDS\}\)\)(?=,(\i))/,
                replace: '$&,$self.shouldShowExophase($1.id)&&$2.push({text:"Exophase",section:"EXOPHASE"})',
            }
        },
        // 2. Tells Discord what to render when the Exophase tab is clicked
        {
            find: ".WIDGETS?",
            replacement: {
                match: /(\i)===\i\.\i\.WISHLIST/,
                replace: '$1==="EXOPHASE"?$self.renderExophaseTab(arguments[0]):$&',
            }
        }
    ],

    // Logic to determine if the tab should appear at all
    shouldShowExophase(userId: string) {
        return Boolean(userId);
    },

    // Renders the mini-card on the small profile popout
    renderProfileCollection: {
        render: ErrorBoundary.wrap((props: { user: User; displayProfile?: any; }) => {
            return <ProfilePopoutComponent userId={props.user?.id} user={props.user} displayProfile={props.displayProfile} />;
        }, { noop: true }),
        priority: 0,
    },

    // Renders the full screen tab on the modal
    renderExophaseTab: ErrorBoundary.wrap((props: { user: User; displayProfile?: any; }) => {
        return <ProfileTabComponent user={props.user} displayProfile={props.displayProfile} />;
    }, { noop: true }),

    start() {
        console.log("Exophase Achievements plugin is enabled.");
    },

    stop() {
        console.log("Exophase Achievements plugin is disabled.");
    }
});