// backend/src/services/bedrock.service.ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export class BedrockService {
    private readonly client: BedrockRuntimeClient;

    constructor() {
        this.client = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
    }

    async generateInsight(prompt: string): Promise<string> {
        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0", // Cheapest model
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload)
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return responseBody.content[0].text;
    }

    async generateWrappedStory(stats: any): Promise<string> {
        const prompt = `You are a creative storyteller for League of Legends players. Create an engaging, personalized year-end recap story based on these stats:

Total Games: ${stats.totalGames}
Win Rate: ${stats.winRate.toFixed(1)}%
Most Played Champion: ${stats.championStats[0].name} (${stats.championStats[0].games} games)
Best Champion: ${stats.championStats.find((c: any) => c.games >= 5)?.name || stats.championStats[0].name}
Longest Win Streak: ${stats.streaks.longestWinStreak}
Peak KDA: ${stats.peakPerformance.kda.toFixed(2)}

Write a short, exciting narrative (3-4 paragraphs) that celebrates their journey. Make it personal, epic, and sharable. Include specific numbers naturally in the story.`;

        return await this.generateInsight(prompt);
    }

    async generateAlternateReality(stats: any, scenario: string): Promise<string> {
        const prompt = `Analyze this League of Legends player's data and create a "what if" alternate reality scenario.

Current Reality:
- Total Games: ${stats.totalGames}
- Win Rate: ${stats.winRate.toFixed(1)}%
- Most Played: ${stats.championStats[0].name} (${stats.championStats[0].games} games)
- Monthly Performance: ${JSON.stringify(stats.performanceTimeline)}

Scenario: ${scenario}

Provide:
1. A realistic projection of what might have happened
2. Estimated impact on win rate (be conservative)
3. A short narrative about this alternate timeline
4. Key insight about what this reveals

Keep it under 200 words, engaging, and slightly dramatic.`;

        return await this.generateInsight(prompt);
    }

    async generateAchievements(stats: any): Promise<any[]> {
        const prompt = `Based on these League stats, generate 5 unique, creative achievements. Mix impressive accomplishments with quirky observations:

Stats: ${JSON.stringify(stats, null, 2)}

Return ONLY a JSON array with this structure:
[
  {
    "title": "Achievement Name",
    "description": "Fun description",
    "category": "legendary|quirky|narrative",
    "rarity": "common|rare|epic|legendary"
  }
]

Make them personal, specific to the data, and shareable.`;

        const response = await this.generateInsight(prompt);
        // Parse JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }
}