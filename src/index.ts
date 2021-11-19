import express, { Express } from 'express';
import logger from './middleware/logger';
import startupAppConfig from './startup/app-config';
import setRoutes from './routes';
import { PORT } from './config/environment';

const app: Express = express();

startupAppConfig(app);
setRoutes(app);

const port = PORT ? parseInt(PORT, 10) : 3000;
app.listen(port, () => logger.info(`Listening on port ${port}...`));

export default app;
