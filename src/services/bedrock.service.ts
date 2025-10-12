
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

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {  ProcessedStats } from '../services/dataprocessing.service';

export class BedrockService {
    private client: BedrockRuntimeClient;
    private modelId = 'anthropic.claude-3-haiku-20240307-v1:0'; // Cheapest model

    constructor() {
        this.client = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }

    private async invokeModel(prompt: string): Promise<string> {
        const payload = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1000,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
        };

        try {
            const command = new InvokeModelCommand({
                modelId: this.modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(payload),
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            return responseBody.content[0].text;
        } catch (error) {
            console.error('Bedrock invocation error:', error);
            throw new Error('Failed to generate AI content');
        }
    }

    async generateWrappedStory(stats: ProcessedStats): Promise<string> {
        const topChamp = stats.championStats[0];
        const prompt = `You are a creative storyteller for League of Legends players. Create an engaging, personalized year-end recap story based on these stats:

Total Games: ${stats.totalGames}
Win Rate: ${stats.winRate.toFixed(1)}%
Most Played Champion: ${topChamp?.name} (${topChamp?.games} games)
Average KDA: ${stats.kdaAverage.toFixed(2)}
Longest Win Streak: ${stats.streaks.longestWinStreak}
Peak Performance: ${stats.peakPerformance.kda.toFixed(2)} KDA on ${stats.peakPerformance.champion}

Write a short, exciting narrative (3-4 paragraphs, max 200 words) that celebrates their journey. Make it personal, epic, and shareable. Include specific numbers naturally in the story. Use an enthusiastic tone.`;

        return await this.invokeModel(prompt);
    }

    async generateAchievements(stats: ProcessedStats): Promise<Achievement[]> {
        const prompt = `Based on these League of Legends stats, generate 5 unique, creative achievements. Mix impressive accomplishments with quirky observations:

        Stats:
        - Total Games: ${stats.totalGames}
        - Win Rate: ${stats.winRate.toFixed(1)}%
        - Top Champions: ${stats.championStats.slice(0, 3).map(c => `${c.name} (${c.games} games)`).join(', ')}
        - Longest Win Streak: ${stats.streaks.longestWinStreak}
        - Average Vision Score: ${stats.visionScore.toFixed(1)}
        - Tilt Recovery Rate: ${stats.tiltPatterns.tiltRecoveryRate.toFixed(1)}%

        Return ONLY a valid JSON array with this exact structure (no markdown, no extra text):
        [
        {
            "title": "Achievement Name",
            "description": "Fun description with specific numbers",
            "category": "legendary",
            "rarity": "epic"
        }
        ]

        Categories: legendary, quirky, narrative
        Rarities: common, rare, epic, legendary`;

        const response = await this.invokeModel(prompt);

        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('Failed to parse achievements:', response);
            return this.getDefaultAchievements(stats);
        }

        try {
            const achievements = JSON.parse(jsonMatch[0]);
            return achievements.map((a: any, index: number) => ({
                id: `achievement-${index}`,
                ...a,
            }));
        } catch (error) {
            console.error('JSON parse error:', error);
            return this.getDefaultAchievements(stats);
        }
    }

    async generateAlternateRealities(stats: ProcessedStats): Promise<AlternateReality[]> {
        const scenarios = [
            `What if you only played ${stats.championStats[0]?.name} (your most played champion) all year?`,
            `What if you never played after a loss to avoid tilt?`,
            `What if you only played during your peak performance hours?`,
        ];

        const prompt = `Analyze this League of Legends player's data and create "what if" alternate reality scenarios.

            Current Stats:
            - Win Rate: ${stats.winRate.toFixed(1)}%
            - Most Played: ${stats.championStats[0]?.name} (${stats.championStats[0]?.winRate.toFixed(1)}% WR)
            - Tilt Recovery: ${stats.tiltPatterns.tiltRecoveryRate.toFixed(1)}%

            For each scenario, provide a realistic projection. Return ONLY valid JSON array:
            [
            {
                "scenario": "${scenarios[0]}",
                "analysis": "Brief analysis (50 words max)",
                "projectedWinRate": 65.0
            },
            {
                "scenario": "${scenarios[1]}",
                "analysis": "Brief analysis (50 words max)",
                "projectedWinRate": 62.0
            },
            {
                "scenario": "${scenarios[2]}",
                "analysis": "Brief analysis (50 words max)",
                "projectedWinRate": 68.0
            }
        ]`;

        const response = await this.invokeModel(prompt);
        const jsonMatch = response.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
            return this.getDefaultAlternateRealities(stats);
        }

        try {
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            return this.getDefaultAlternateRealities(stats);
        }
    }

    private getDefaultAchievements(stats: ProcessedStats): Achievement[] {
        return [
            {
                id: 'achievement-1',
                title: 'The Grinder',
                description: `Played ${stats.totalGames} games this year`,
                category: 'narrative',
                rarity: 'common',
            },
            {
                id: 'achievement-2',
                title: 'Champion Specialist',
                description: `${stats.championStats[0]?.games} games on ${stats.championStats[0]?.name}`,
                category: 'legendary',
                rarity: 'rare',
            },
            {
                id: 'achievement-3',
                title: 'Win Streak Legend',
                description: `${stats.streaks.longestWinStreak} game win streak`,
                category: 'legendary',
                rarity: 'epic',
            },
            {
                id: 'achievement-4',
                title: 'Vision Master',
                description: `${stats.visionScore.toFixed(0)} average vision score`,
                category: 'quirky',
                rarity: 'rare',
            },
            {
                id: 'achievement-5',
                title: 'Comeback King',
                description: `${stats.tiltPatterns.tiltRecoveryRate.toFixed(0)}% win rate after losses`,
                category: 'narrative',
                rarity: 'epic',
            },
        ];
    }

    private getDefaultAlternateRealities(stats: ProcessedStats): AlternateReality[] {
        return [
            {
                scenario: `What if you only played ${stats.championStats[0]?.name}?`,
                analysis: `Based on your ${stats.championStats[0]?.winRate.toFixed(1)}% win rate, you might have climbed higher.`,
                projectedWinRate: stats.championStats[0]?.winRate || stats.winRate,
            },
            {
                scenario: 'What if you avoided tilt?',
                analysis: 'Taking breaks after losses could improve mental performance.',
                projectedWinRate: stats.winRate + 5,
            },
            {
                scenario: 'What if you played at peak hours?',
                analysis: 'Optimal play times could boost your consistency.',
                projectedWinRate: stats.winRate + 3,
            },
        ];
    }
}