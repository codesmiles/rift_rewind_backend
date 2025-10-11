interface InightInterface{
    generateFullWrapped(matches: any[], puuid: string): Promise<string>;
}

export class InsightsService implements InightInterface{

    generateFullWrapped(matches: any[], puuid: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
}