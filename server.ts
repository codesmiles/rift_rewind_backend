import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import apiRoutes from './src/routes/apiRoutes';
import mongoose from 'mongoose';
import {mongoConfig} from './src/configs';

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});


// add the route here
app.get('/api/insights', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Insights' });
});

app.use('/api', apiRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

const start = () => {
    // mongoose.set("strictQuery", true);

    // mongoose.connect(mongoConfig.mongoURI as string)
    //     .then(() => {
    //         console.log("Successfully connected to data base.", mongoConfig.mongoURI);
    //     })
    //     .catch((err) => {
    //         console.log("bgRed", "There was an error connecting to data base" + err);
    //     });

    app.listen(PORT, () => {
        console.log("Process is listening to PORT: ", PORT)
    })
}

start();
