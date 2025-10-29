export const getWrappedMock = () => {
  // ✅
  const reqBody = {
    gameName: "HideOnBush",
    tagLine: "KR1",
    region: "kr", // optional, defaults to "na1"
  };

  return {
    success: true,
    data: {
      playerInfo: {
        gameName: "HideOnBush",
        tagLine: "KR1",
        puuid: "xxx",
      },
      stats: {
        totalGames: 147,
        wins: 89,
        losses: 58,
        winRate: 60.5,
        kdaAverage: 3.2,
        visionScore: 45.2,
        championStats: [],
        roleDistribution: {},
        performanceTimeline: [],
        streaks: {},
        peakPerformance: {},
        tiltPatterns: {},
      },
      aiInsights: {
        story: "Your 2024 journey...",
        achievements: [],
        alternateRealities: [],
      },
      generatedAt: "2024-10-11T...",
    },
  };
};

export const quickStatsMock = () => {
  // ✅
  return {
    success: true,
    data: {
      totalGames: 147,
      wins: 89,
      losses: 58,
      winRate: 60.5,
      kdaAverage: 3.2,
      visionScore: 45.2,
      championStats: [],
      roleDistribution: {},
      performanceTimeline: [],
      streaks: {},
      peakPerformance: {},
      tiltPatterns: {},
    },
  };
};

export const validateSummonerMock = () => {
  const error = {
    success: false,
    error: "Summoner not found",
    code: "SUMMONER_NOT_FOUND",
  };

  return {
    success: true,
    data: {
      exists: true,
      puuid: "xxx",
      level: 342,
      icon: 29,
    },
  };
};

export const generate_content_response_mock = () => {
  const req_body = {
    // "stats": { /* processed stats object */ },
    // "tone": "hype" | "nostalgic" | "roast" | "growth" | "meme"
  };

  return {
    success: true,
    data: {
      story: "Generated narrative...",
      tone: "hype",
    },
  };
};

export const generateAchievements = () => {
  const req_body = {
    stats: {
      /* processed stats */
    },
    count: 5, // number of achievements to generate
  };

  return {
    success: true,
    data: {
      achievements: [
        {
          id: "unique-id",
          title: "Vision Oracle",
          description: "Placed 2,847 wards this year",
          category: "legendary",
          rarity: "epic",
          icon: "👁️",
        },
      ],
    },
  };
};

export const alternate_reality_mock = () => {
  const request_body = {
    // "stats": { /* processed stats */ },
    // "scenario": "custom" | "best-champion" | "peak-hours" | "no-tilt",
    // "customScenario": "What if I never played after midnight?" // if scenario is "custom"
  };

  return {
    success: true,
    data: {
      scenario: "What if you only played your best champion?",
      analysis: "Based on your Ahri stats...",
      projectedWinRate: 65.2,
      projectedRank: "Platinum 1",
      narrative: "In this timeline...",
    },
  };
};

export const batch_alternate_reality_mock = () => {
  const request_body = {
    stats: {
      /* processed stats */
    },
    scenarios: ["best-champion", "peak-hours", "no-tilt"],
  };

  return {
    success: true,
    data: {
      realities: [
        {
          scenario: "best-champion",
          analysis: "...",
          projectedImpact: {},
        },
      ],
    },
  };
};

export const get_match_history_mock = () => {
  const query_param = "?puuid=xxx&count=100&startIndex=0";

  return {
    success: true,
    data: {
      matchIds: ["NA1_123...", "NA1_124..."],
      count: 100,
      hasMore: true,
    },
  };
};

export const get_match_details_mock = () => {
  const request_param = "matchId";

  return {
    success: true,
    data: {
      matchId: "NA1_123",
      gameCreation: 1234567890,
      gameDuration: 1847,
      participants: [],
    },
  };
};

export const compare_with_friends_mock = () => {
  const req_body = {
    player1: {
      gameName: "Player1",
      tagLine: "NA1",
    },
    player2: {
      gameName: "Player2",
      tagLine: "NA1",
    },
  };

  return {
    success: true,
    data: {
      comparison: {
        player1Stats: {},
        player2Stats: {},
        winner: "player1", // who has better overall stats
        categories: {
          winRate: { winner: "player1", diff: 5.2 },
          kda: { winner: "player2", diff: 0.3 },
        },
      },
      aiInsight: "Player 1 dominates in consistency...",
    },
  };
};

export const quad_analysis_mock = () => {
  const req_body = {
    success: true,
    data: {
      comparison: {
        player1Stats: {},
        player2Stats: {},
        winner: "player1", // who has better overall stats
        categories: {
          winRate: { winner: "player1", diff: 5.2 },
          kda: { winner: "player2", diff: 0.3 },
        },
      },
      aiInsight: "Player 1 dominates in consistency...",
    },
  };
};

export const save_wrapped_mock = () => {
  const req_body = {
    wrappedData: {
      /* full wrapped object */
    },
    shareId: "unique-id", // optional, generated if not provided
  };

  return {
    success: true,
    data: {
      shareId: "abc123xyz",
      shareUrl: "https://yourapp.com/share/abc123xyz",
      expiresAt: "2025-01-11T...",
    },
  };
};

export const get_wrapped_mock = () => {
  const query_param = "?shareId=abc123xyz";

  return {
    success: true,
    data: {
      wrappedData: {},
      createdAt: "2024-10-11T...",
      playerInfo: {},
    },
  };
};

export const get_api_health = () => {
  return {
    status: "ok",
    timestamp: "2024-10-11T...",
    services: {
      riotAPI: "connected",
      bedrock: "connected",
      database: "connected",
    },
  };
};
