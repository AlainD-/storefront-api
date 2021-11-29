import logger from './middleware/logger';
import { PORT } from './config/environment';
import app from './app';

const port = PORT ? parseInt(PORT, 10) : 3000;
app.listen(port, () => logger.info(`Listening on port ${port}...`));

export default app;
