import axios from 'axios';

class RiotApiEndpoints {
    public static readonly RIOT_API_KEY = process.env.RIOT_API_KEY || "";
    private readonly BASE_URL = process.env.RIOT_API_BASE_URL ?? "";

    getPUUID = (gameName: string, tagLine: string, region: string = 'americas') =>`https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`;
    getMatchHistory = (puuid: string, count: number = 100) => `${this.BASE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
    getMatchDetails = (matchId: string) => `${this.BASE_URL}/lol/match/v5/matches/${matchId}`;
    getAllMatches = (puuid: string, countNumber?: number) => `${this.BASE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${countNumber}`;
    getRegions = () => `${this.BASE_URL}/lol/region/v1/regions`;
}

export class RiotAPIService {
    private readonly headers = {
        'X-Riot-Token': RiotApiEndpoints.RIOT_API_KEY!
    };

    // Get PUUID by summoner name
    async getPUUID(gameName: string, tagLine: string, region: string = 'americas') {
        console.log(gameName, tagLine, region);
        const url = new RiotApiEndpoints().getPUUID(gameName, tagLine, region);
        const response = await axios.get(url, { headers: this.headers });
        return response.data.puuid;
    }

    // Get match history (last 100 matches)
    async getMatchHistory(puuid: string, count: number = 100) {
        const url = new RiotApiEndpoints().getMatchHistory(puuid, count);
        const response = await axios.get(url, { headers: this.headers });
        return response.data;
    }

    // Get match details
    async getMatchDetails(matchId: string) {
        const url = new RiotApiEndpoints().getMatchDetails(matchId);
        const response = await axios.get(url, { headers: this.headers });
        return response.data;
    }

    // Batch fetch matches
    async getAllMatches(puuid: string, countNumber?: number) {
        const matchIds = await this.getMatchHistory(puuid, countNumber);
        console.log(matchIds);

        const matches = await Promise.all(
            matchIds.map((id: string) => this.getMatchDetails(id))
        );
        return matches;
    }

    async getRegions() {
        const url = new RiotApiEndpoints().getRegions();
        const response = await axios.get(url, { headers: this.headers });
        return response.data;
    }
}