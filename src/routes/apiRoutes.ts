// backend/src/routes/api.routes.ts
import express from 'express';
import { RiotAPIService } from '../services/riot.service';
import { InsightsService } from '../services/insights.service';

const router = express.Router();
const riotAPI = new RiotAPIService();
const insightsService = new InsightsService();

// Main endpoint: Generate wrapped
router.post('/generate-wrapped', async (req, res) => {
    try {
        const { gameName, tagLine } = req.body;

        // 1. Get PUUID
        const puuid = await riotAPI.getPUUID(gameName, tagLine);

        // 2. Fetch matches
        const matches = await riotAPI.getAllMatches(puuid);

        // 3. Generate insights
        const wrapped = await insightsService.generateFullWrapped(matches, puuid);

        res.json({
            success: true,
            data: wrapped
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Quick stats endpoint (no AI, faster)
router.post('/quick-stats', async (req, res) => {
    try {
        const { gameName, tagLine } = req.body;
        const puuid = await riotAPI.getPUUID(gameName, tagLine);
        const matches = await riotAPI.getAllMatches(puuid);

        const processor = new (await import('../services/dataprocessing.service')).DataProcessorService();
        const stats = processor.processMatchData(matches, puuid);

        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/regions', (req, res) => {
    res.json({
        success: true,
        data: riotAPI.getRegions()
    });
});
export default router;