import { DataProcessorService } from "./dataprocessing.service";
// import { BedrockService } from './bedrock.service';
import { GoogleAIService } from "./googleAiStudioService";
import { AIInsights, WrappedData } from "../utils/interfaces.util";

export class InsightsService {
  private readonly processor: DataProcessorService;
  private readonly googleAi: GoogleAIService;

  constructor() {
    this.processor = new DataProcessorService();
    this.googleAi = new GoogleAIService();
  }

  async generateFullWrapped(
    matches: any[],
    puuid: string,
    gameName: string,
    tagLine: string,
  ) {
    //: Promise<WrappedData>
    // TODO: save to the db if it exists and cache for 24 hours and work towards the logic to update the db every 30 days

    console.log(`Processing ${matches.length} matches...`);

    // Process stats
    const stats = this.processor.processMatchData(matches, puuid);
    return { matches, stats };
    console.log("Stats processed");

    // Generate AI insights in parallel
    console.log("Generating AI insights...");
    const [story, achievements, alternateRealities] = await Promise.all([
      this.googleAi.generateWrappedStory(stats).catch((err) => {
        console.error("Story generation failed:", err);
        return "Your League journey was epic this year!";
      }),
      this.googleAi.generateAchievements(stats).catch((err) => {
        console.error("Achievement generation failed:", err);
        return [];
      }),
      this.googleAi.generateAlternateRealities(stats).catch((err) => {
        console.error("Alternate reality generation failed:", err);
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
