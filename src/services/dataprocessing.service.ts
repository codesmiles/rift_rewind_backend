import { ChampionStat, ProcessedMatch, ProcessedStats, RoleStats, TiltAnalysis } from "../utils/interfaces.util";

export class DataProcessorService {
    processMatchData(matches: any[], puuid: string):ProcessedStats {
        const playerMatches = this.extractPlayerMatches(matches, puuid);

        return {
            totalGames: playerMatches.length,
            wins: playerMatches.filter(m => m.win).length,
            losses: playerMatches.filter(m => !m.win).length,
            winRate: this.calculateWinRate(playerMatches),
            kdaAverage: this.calculateAverageKDA(playerMatches),
            visionScore: this.calculateAverageVision(playerMatches),
            championStats: this.calculateChampionStats(playerMatches),
            roleDistribution: this.calculateRoleDistribution(playerMatches),
            performanceTimeline: this.calculateMonthlyPerformance(playerMatches),
            streaks: this.calculateStreaks(playerMatches),
            peakPerformance: this.findPeakMoment(playerMatches),
            tiltPatterns: this.analyzeTiltPatterns(playerMatches),
        };
    }

    private extractPlayerMatches(matches: any[], puuid: string): ProcessedMatch[] {
        return matches.map(match => {
            const participant = match.info.participants.find(
                (p: any) => p.puuid === puuid
            );

            if (!participant) {
                throw new Error('Player not found in match');
            }

            return {
                matchId: match.metadata.matchId,
                gameDate: new Date(match.info.gameCreation),
                win: participant.win,
                championName: participant.championName,
                kills: participant.kills,
                deaths: participant.deaths,
                assists: participant.assists,
                kda: participant.deaths === 0
                    ? participant.kills + participant.assists
                    : (participant.kills + participant.assists) / participant.deaths,
                visionScore: participant.visionScore,
                goldEarned: participant.goldEarned,
                totalDamage: participant.totalDamageDealtToChampions,
                position: participant.teamPosition || 'UNKNOWN',
                gameDuration: match.info.gameDuration,
            };
        });
    }

    private calculateChampionStats(matches: ProcessedMatch[]): ChampionStat[] {
        const champMap = new Map<string, ChampionStat>();

        matches.forEach(match => {
            const champ = match.championName;
            if (!champMap.has(champ)) {
                champMap.set(champ, {
                    name: champ,
                    games: 0,
                    wins: 0,
                    losses: 0,
                    winRate: 0,
                    kda: 0,
                    avgKDA: 0,
                    totalKills: 0,
                    totalDeaths: 0,
                    totalAssists: 0,
                });
            }

            const stats = champMap.get(champ)!;
            stats.games++;
            if (match.win) {
                stats.wins++;
            } else {
                stats.losses++;
            }
            stats.kda += match.kda;
            stats.totalKills += match.kills;
            stats.totalDeaths += match.deaths;
            stats.totalAssists += match.assists;
        });

        return Array.from(champMap.values())
            .map(champ => ({
                ...champ,
                winRate: (champ.wins / champ.games) * 100,
                avgKDA: champ.kda / champ.games,
            }))
            .sort((a, b) => b.games - a.games);
    }


    private calculateMonthlyPerformance(matches: any[]) {
        const monthlyData = new Map();

        matches.forEach(match => {
            const month = match.gameDate.toISOString().slice(0, 7); // YYYY-MM
            if (!monthlyData.has(month)) {
                monthlyData.set(month, { month, games: 0, wins: 0, kda: 0 });
            }
            const data = monthlyData.get(month);
            data.games++;
            if (match.win) data.wins++;
            data.kda += match.kda;
        });

        return Array.from(monthlyData.values())
            .map(month => ({
                ...month,
                winRate: (month.wins / month.games) * 100,
                avgKDA: month.kda / month.games
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }

    private calculateStreaks(matches: any[]) {
        let currentStreak = 0;
        let longestWinStreak = 0;
        let longestLossStreak = 0;
        let currentWinStreak = 0;
        let currentLossStreak = 0;

        matches.forEach(match => {
            if (match.win) {
                currentWinStreak++;
                currentLossStreak = 0;
                longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
            } else {
                currentLossStreak++;
                currentWinStreak = 0;
                longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
            }
        });

        return { longestWinStreak, longestLossStreak };
    }

    private findPeakMoment(matches: any[]) {
        const bestGame = matches.reduce((best, current) => {
            return current.kda > best.kda ? current : best;
        });

        return {
            champion: bestGame.championName,
            kda: bestGame.kda,
            date: bestGame.gameDate,
            kills: bestGame.kills,
            deaths: bestGame.deaths,
            assists: bestGame.assists
        };
    }


    private calculateWinRate(matches: ProcessedMatch[]): number {
        if (matches.length === 0) return 0;
        const wins = matches.filter(m => m.win).length;
        return (wins / matches.length) * 100;
    }

    // Additional helper methods...
    private calculateRoleDistribution(matches: ProcessedMatch[]): RoleStats {
        const roles: RoleStats = {
            TOP: 0,
            JUNGLE: 0,
            MIDDLE: 0,
            BOTTOM: 0,
            UTILITY: 0,
        };

        matches.forEach(match => {
            const position = match.position.toUpperCase();
            if (position in roles) {
                roles[position as keyof RoleStats]++;
            }
        });

        return roles;
    }

    private calculateAverageKDA(matches: any[]):number {
        if (matches.length === 0) return 0;
        const totalKDA = matches.reduce((sum, m) => sum + m.kda, 0);
        return totalKDA / matches.length;
}
    private calculateAverageVision(matches: any[]) {
        if (matches.length === 0) return 0;
        const totalVision = matches.reduce((sum, m) => sum + m.visionScore, 0);
        return totalVision / matches.length;
    }
    private analyzeTiltPatterns(matches: ProcessedMatch[]): TiltAnalysis {
        // Sort by date (oldest first)
        const sortedMatches = [...matches].sort(
            (a, b) => a.gameDate.getTime() - b.gameDate.getTime()
        );

        let gamesAfterLoss = 0;
        let winsAfterLoss = 0;
        let totalKDAAfterLoss = 0;

        for (let i = 1; i < sortedMatches.length; i++) {
            if (!sortedMatches[i - 1].win) {
                gamesAfterLoss++;
                totalKDAAfterLoss += sortedMatches[i].kda;
                if (sortedMatches[i].win) {
                    winsAfterLoss++;
                }
            }
        }

        return {
            tiltRecoveryRate: gamesAfterLoss > 0 ? (winsAfterLoss / gamesAfterLoss) * 100 : 0,
            gamesAfterLoss,
            winsAfterLoss,
            avgPerformanceAfterLoss: gamesAfterLoss > 0 ? totalKDAAfterLoss / gamesAfterLoss : 0,
        };
    }
    private detectComebackGames(matches: any[], fullMatches: any[]) { /* ... */ }
}