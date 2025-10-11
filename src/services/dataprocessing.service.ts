export interface ChampionStat {
    name: string;
    games: number;
    wins: number;
    kda: number;
    winRate: number;
    avgKDA: number;
}

export interface RoleStats {
    [role: string]: {
        games: number;
        wins: number;
        winRate: number;
        avgKDA: number;
    };
}

export interface MonthlyPerformance {
    month: string;
    games: number;
    wins: number;
    winRate: number;
    avgKDA: number;
}

export interface StreakData {
    longestWinStreak: number;
    longestLossStreak: number;
}

export interface PeakMoment {
    champion: string;
    kda: number;
    date: Date;
    kills: number;
    deaths: number;
    assists: number;
}

export interface TiltAnalysis {
    tiltRecoveryRate: number;
    gamesAfterLoss: number;
    winsAfterLoss: number;
}

export interface ProcessedStats {
    wins: number;
    losses: number;
    winRate: number;
    streaks: StreakData;
    totalGames: number;
    // kdaAverage: number;
    // visionScore: number;
    tiltPatterns: TiltAnalysis;
    championStats: ChampionStat[];
    // comebackGames: number;
    peakPerformance: PeakMoment;
    // roleDistribution: RoleStats;
    performanceTimeline: MonthlyPerformance[];
}

export class DataProcessorService {
    processMatchData(matches: any[], puuid: string):ProcessedStats {
        const playerMatches = matches.map(match => {
            const participant = match.info.participants.find(
                (p: any) => p.puuid === puuid
            );
            return {
                matchId: match.metadata.matchId,
                gameDate: new Date(match.info.gameCreation),
                win: participant.win,
                championName: participant.championName,
                kills: participant.kills,
                deaths: participant.deaths,
                assists: participant.assists,
                kda: (participant.kills + participant.assists) / Math.max(1, participant.deaths),
                visionScore: participant.visionScore,
                goldEarned: participant.goldEarned,
                totalDamage: participant.totalDamageDealtToChampions,
                position: participant.teamPosition,
                gameDuration: match.info.gameDuration,
            };
        });

        return {
            wins: playerMatches.filter(m => m.win).length,
            losses: playerMatches.filter(m => !m.win).length,
            streaks: this.calculateStreaks(playerMatches),
            winRate: (playerMatches.filter(m => m.win).length / playerMatches.length) * 100,
            // kdaAverage: this.calculateAverageKDA(playerMatches),
            totalGames: playerMatches.length,
            // visionScore: this.calculateAverageVision(playerMatches),
            tiltPatterns: this.analyzeTiltPatterns(playerMatches),
            // comebackGames: this.detectComebackGames(playerMatches, matches),
            championStats: this.calculateChampionStats(playerMatches),
            peakPerformance: this.findPeakMoment(playerMatches),
            // roleDistribution: this.calculateRoleDistribution(playerMatches),
            performanceTimeline: this.calculateMonthlyPerformance(playerMatches),
        };
    }

    private calculateChampionStats(matches: any[]) {
        const champMap = new Map();
        matches.forEach(match => {
            const champ = match.championName;
            if (!champMap.has(champ)) {
                champMap.set(champ, { name: champ, games: 0, wins: 0, kda: 0 });
            }
            const stats = champMap.get(champ);
            stats.games++;
            if (match.win) stats.wins++;
            stats.kda += match.kda;
        });

        return Array.from(champMap.values())
            .map(champ => ({
                ...champ,
                winRate: (champ.wins / champ.games) * 100,
                avgKDA: champ.kda / champ.games
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

    private analyzeTiltPatterns(matches: any[]) {
        // Performance after losses
        let performanceAfterLoss = 0;
        let lossCount = 0;

        for (let i = 1; i < matches.length; i++) {
            if (!matches[i - 1].win) {
                lossCount++;
                if (matches[i].win) performanceAfterLoss++;
            }
        }

        const tiltRecoveryRate = lossCount > 0 ? (performanceAfterLoss / lossCount) * 100 : 0;

        return {
            tiltRecoveryRate,
            gamesAfterLoss: lossCount,
            winsAfterLoss: performanceAfterLoss
        };
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

    // Additional helper methods...
    private calculateRoleDistribution(matches: any[]) { /* ... */ }
    private calculateAverageKDA(matches: any[]) { /* ... */ }
    private calculateAverageVision(matches: any[]) { /* ... */ }
    private detectComebackGames(matches: any[], fullMatches: any[]) { /* ... */ }
}