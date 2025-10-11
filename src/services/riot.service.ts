// backend/src/services/riotAPI.service.ts
import axios from 'axios';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const BASE_URL = process.env.RIOT_API_BASE_URL;

export class RiotAPIService {
    private readonly headers = {
        'X-Riot-Token': RIOT_API_KEY!
    };

    // Get PUUID by summoner name
    async getPUUID(gameName: string, tagLine: string, region: string = 'na1') {
        const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`;
        const response = await axios.get(url, { headers: this.headers });
        return response.data.puuid;
    }

    // Get match history (last 100 matches)
    async getMatchHistory(puuid: string, count: number = 100) {
        const url = `${BASE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
        const response = await axios.get(url, { headers: this.headers });
        return response.data;
    }

    // Get match details
    async getMatchDetails(matchId: string) {
        const url = `${BASE_URL}/lol/match/v5/matches/${matchId}`;
        const response = await axios.get(url, { headers: this.headers });
        return response.data;
    }

    // Batch fetch matches
    async getAllMatches(puuid: string) {
        const matchIds = await this.getMatchHistory(puuid);
        const matches = await Promise.all(
            matchIds.map((id: string) => this.getMatchDetails(id))
        );
        return matches;
    }

    async getRegions() {
        const url = `${BASE_URL}/lol/region/v1/regions`;
        const response = await axios.get(url, { headers: this.headers });
        return response.data;
    }
}