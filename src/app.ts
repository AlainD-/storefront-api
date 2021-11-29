import express, { Express } from 'express';
import startupAppConfig from './startup/app-config';
import setRoutes from './routes';

const app: Express = express();

startupAppConfig(app);
setRoutes(app);

export default app;
