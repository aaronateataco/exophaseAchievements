import { ExophaseGame } from "./types";

export async function fetchExophaseGames(username: string): Promise<ExophaseGame[]> {
    if (!username) {
        console.warn("Exophase API: No username provided.");
        return [];
    }

    try {
        const response = await fetch(`https://exophaseapi.vercel.app/api/v1/user/${username}/games`);

        if (!response.ok) {
            throw new Error(`Exophase API returned status ${response.status}`);
        }

        const data = await response.json();
        const gamesList = Array.isArray(data) ? data : (data.list || data.games || data.data || []);

        return gamesList;
    } catch (error) {
        console.error("Failed to fetch Exophase games:", error);
        return [];
    }
}