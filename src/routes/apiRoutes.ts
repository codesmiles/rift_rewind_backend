// backend/src/routes/api.routes.ts
import { Router , Request,Response} from 'express';
import { RiotAPIService } from '../services/riot.service';
import { InsightsService } from '../services/insights.service';

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
        const wrapped = await insightsService.generateFullWrapped(matches, puuid);
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
        res.json(response.toJson());
    } catch (error: any) {
        const response = new ResponseFormat(false, error.message)
        res.status(500).json(response.toJson());
    }
});


router.get('/regions', (req:Request, res:Response) => {
    const response = new ResponseFormat(true, riotAPI.getRegions())
    res.json(response.toJson());
});
export default router;