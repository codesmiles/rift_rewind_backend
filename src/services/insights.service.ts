import { DataProcessorService, ProcessedStats } from './dataprocessing.service';
import { Achievement, AlternateReality, BedrockService } from './bedrock.service';
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
// import { AIInsights, WrappedData } from './types';

export class InsightsService {
    private processor: DataProcessorService;
    private bedrock: BedrockService;

    constructor() {
        this.processor = new DataProcessorService();
        this.bedrock = new BedrockService();
    }

    async generateFullWrapped(
        matches: any[],
        puuid: string,
        gameName: string,
        tagLine: string
    ): Promise<WrappedData> {
        console.log(`Processing ${matches.length} matches...`);

        // Process stats
        const stats = this.processor.processMatchData(matches, puuid);
        console.log('Stats processed');

        // Generate AI insights in parallel
        console.log('Generating AI insights...');
        const [story, achievements, alternateRealities] = await Promise.all([
            this.bedrock.generateWrappedStory(stats).catch(err => {
                console.error('Story generation failed:', err);
                return 'Your League journey was epic this year!';
            }),
            this.bedrock.generateAchievements(stats).catch(err => {
                console.error('Achievement generation failed:', err);
                return [];
            }),
            this.bedrock.generateAlternateRealities(stats).catch(err => {
                console.error('Alternate reality generation failed:', err);
                return [];
            }),
        ]);

        const aiInsights: AIInsights = {
            story,
            achievements,
            alternateRealities,
        };

        return {
            playerInfo: {
                gameName,
                tagLine,
                puuid,
            },
            stats,
            aiInsights,
            generatedAt: new Date().toISOString(),
        };
    }
}