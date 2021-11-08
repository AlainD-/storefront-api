import express, { Express } from 'express';
import dotenv from 'dotenv';
import logger from './middleware/logger';
import startupAppConfig from './startup/app-config';
import setRoutes from './routes';

dotenv.config();
const app: Express = express();

startupAppConfig(app);
setRoutes(app);

const port = process.env.PORT || 3000;
app.listen(port, () => logger.info(`Listening on port ${port}...`));

export default app;
