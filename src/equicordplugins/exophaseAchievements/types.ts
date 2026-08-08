export interface ExophaseGame {
    id?: string | number;
    title?: string;
    name?: string;
    game_title?: string;
    image?: string;
    icon?: string;
    thumb?: string;
    cover?: string;
    progress?: number;
    completion?: number;
    percentage?: number;
    achievements?: number;
    unlocked_achievements?: number;
    platform?: string;
    url?: string;
    link?: string;
}

export interface ExophaseCardProps {
    game: ExophaseGame;
}

export interface SubTabsProps {
    platforms: string[];
    activePlatform: string;
    onSelect: (platform: string) => void;
}

export interface IconProps {
    className?: string;
    width?: number;
    height?: number;
}