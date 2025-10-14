// backend/src/routes/api.routes.ts
import { Router , Request,Response} from 'express';
import { RiotAPIService } from '../services/riot.service';
import { InsightsService } from '../services/insights.service';
import { BedrockService } from '../services/bedrock.service';
import { DataProcessorService } from '../services/dataprocessing.service';

const router = Router();
const riotAPI = new RiotAPIService();
const insightsService = new InsightsService();

export class ResponseFormat  {
    private readonly success: boolean;
    private readonly data: any;

    constructor(success:boolean, data:any) {
        this.success = success;
        this.data = data;
    }
    
    toJson() {
        return {
            success: this.success,
            data: this.data
        }
    }
}

// Main endpoint: Generate wrapped
router.post('/wrapped/generate', async (req:Request, res:Response) => {
    try {
        // TODO: Add validations later
        // const { gameName, tagLine, region, count } = await req.body;
        const count = await req.body.count;
        const region = await req.body.region;
        const tagLine = await req.body.tagLine;
        const gameName = await req.body.gameName;
        
        if(!gameName || !tagLine){
            throw new Error('Missing required fields');
        }

        // Get PUUID
        const puuid = await riotAPI.getPUUID(gameName, tagLine, region);

        // Fetch matches
        const countNumber = count;
        const matches = await riotAPI.getAllMatches(puuid,countNumber);

        // Generate insights
        const wrapped = await insightsService.generateFullWrapped(matches, puuid, gameName, tagLine);
        console.log("\n\n\n response", { puuid, matches, wrapped });
        
        const response = new ResponseFormat(true, wrapped)
        res.json(response.toJson());
    } catch (error: any) {
        const response = new ResponseFormat(false, error)
        res.status(500).json(response.toJson());
    }
});

// Quick stats endpoint (no AI, faster)
router.post('/quick-stats', async (req:Request, res:Response) => {
    try {
        const { gameName, tagLine } = req.body;
        const puuid = await riotAPI.getPUUID(gameName, tagLine);
        const matches = await riotAPI.getAllMatches(puuid);

        const processor = new (await import('../services/dataprocessing.service')).DataProcessorService();
        const stats = processor.processMatchData(matches, puuid);

        const response = new ResponseFormat(true, stats)
        return res.json(response.toJson());
    } catch (error: any) {
        const response = new ResponseFormat(false, error.message)
        return res.status(500).json(response.toJson());
    }
});


router.get('/regions', (req:Request, res:Response) => {
    const response = new ResponseFormat(true, riotAPI.getRegions())
    return res.json(response.toJson());
});

router.get("/ai/story", async (req: Request, res: Response) => {
    const insightsService = new InsightsService();
    try {
        const { matches, puuid, gameName, tagLine } = req.body;

        if(!matches || !puuid || !gameName || !tagLine){
            throw new Error('Missing required fields');
        }
        const story = await insightsService.generateFullWrapped(matches, puuid, gameName, tagLine);
        const response = new ResponseFormat(true, story)
        return res.json(response.toJson());
    } catch (error: any) {
        const response = new ResponseFormat(false, error.message)
        return res.status(500).json(response.toJson());
    }
})

router.post("/ai/alternate-reality", async (req:Request, res:Response) => {
    try {
        const bedRockService = new BedrockService();
        const { matches, puuid, gameName, tagLine } = req.body;

        if(!matches || !puuid || !gameName || !tagLine){
            throw new Error('Missing required fields');
        }
      const stats = new DataProcessorService().processMatchData(matches, puuid)
        const story = await bedRockService.generateAlternateRealities(stats);
        const response = new ResponseFormat(true, story)
        return res.json(response.toJson());
    } catch (error: any) {
        const response = new ResponseFormat(false, error.message)
        return res.status(500).json(response.toJson());
    }
})
router.post("/summoner/validate", async (req:Request, res:Response) => {
    try {
        // validate summoner
        const { gameName, tagLine } = req.body;
        const puuid = await riotAPI.getPUUID(gameName, tagLine);
        const response = new ResponseFormat(true, puuid)
        return res.json(response.toJson());
    } catch (error: any) {
        const response = new ResponseFormat(false, error.message)
        return res.status(500).json(response.toJson());
    }
})

router.get("/health", (req:Request, res:Response) => {
    const response = new ResponseFormat(true, {"Riot API Health": riotAPI.health(), "Bedrock API Health": new BedrockService().health()})
    return res.json(response.toJson());
})

router.get("/ai/achievements", async (req: Request, res: Response) => {
    try {
        const { matches, puuid, gameName, tagLine } = req.body;

        if(!matches || !puuid || !gameName || !tagLine){
            throw new Error('Missing required fields');
        }
        const stats = new DataProcessorService().processMatchData(matches, puuid);
        const achievements = await new BedrockService().generateAchievements(stats);

        const response = new ResponseFormat(true, achievements)
        return res.json(response.toJson());
    } catch (error: any) {
        const response = new ResponseFormat(false, error.message)
        return res.status(500).json(response.toJson());
    }
})

export default router;