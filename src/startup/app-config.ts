import morgan from 'morgan';
import cors from 'cors';
import { Express, RequestHandler } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import logging from '../middleware/logging';
import logger from '../middleware/logger';

export default function appConfig(app: Express): void {
  logging();

  if (app.get('env') === 'development') {
    app.use(morgan<IncomingMessage, ServerResponse>('tiny'));
    logger.info('Morgan enabled...');
  }

  const CORS_OPTIONS = {
    origin: '*',
    optionsSuccessStatus: 200,
    exposedHeaders: ['Content-Disposition', 'X-Filename'], // add 'Content-Disposition' to CORS for download features
  };
  app.options('*', cors() as RequestHandler); // enable pre-flight request. include before other routes
  app.use(cors(CORS_OPTIONS));
}
