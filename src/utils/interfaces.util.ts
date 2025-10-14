export interface AIInsights {
    story: string;
    achievements: Achievement[];
    alternateRealities: AlternateReality[];
}
export interface WrappedData {
    playerInfo: {
        gameName: string;
        tagLine: string;
        puuid: string;
    };
    stats: ProcessedStats;
    aiInsights: AIInsights;
    generatedAt: string;
}

export interface ChampionStat {
    name: string;
    games: number;
    wins: number;
    losses: number;
    winRate: number;
    kda: number;
    avgKDA: number;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
}

export interface RoleStats {
    TOP: number;
    JUNGLE: number;
    MIDDLE: number;
    BOTTOM: number;
    UTILITY: number;
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
    avgPerformanceAfterLoss: number;
}

export interface ProcessedStats {
    wins: number;
    losses: number;
    winRate: number;
    streaks: StreakData;
    totalGames: number;
    kdaAverage: number;
    visionScore: number;
    tiltPatterns: TiltAnalysis;
    championStats: ChampionStat[];
    // comebackGames: number;
    peakPerformance: PeakMoment;
    roleDistribution: RoleStats;
    performanceTimeline: MonthlyPerformance[];
}

export interface ProcessedMatch {
    matchId: string;
    gameDate: Date;
    win: boolean;
    championName: string;
    kills: number;
    deaths: number;
    assists: number;
    kda: number;
    visionScore: number;
    goldEarned: number;
    totalDamage: number;
    position: string;
    gameDuration: number;
}


export interface Achievement {
    id: string;
    title: string;
    description: string;
    category: 'legendary' | 'quirky' | 'narrative';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    icon?: string;
}

export interface AlternateReality {
    scenario: string;
    analysis: string;
    projectedWinRate?: number;
    projectedRank?: string;
}


export interface PaginatedResponse<T> {
    payload: T[];
    meta: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}
  
export interface HasApiHelth {
    health(): Promise<boolean>
}
