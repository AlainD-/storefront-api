import morgan from 'morgan';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { Express, RequestHandler } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import logging from '../middleware/logging';
import logger from '../middleware/logger';
import { PRIVATE_KEY_PATH, PUBLIC_KEY_PATH } from '../config/environment';

export default function appConfig(app: Express): void {
  logging();

  if (app.get('env') === 'development') {
    app.use(morgan<IncomingMessage, ServerResponse>('tiny'));
    logger.info('Morgan enabled...');
  }

  try {
    if (!PRIVATE_KEY_PATH) {
      throw new Error('Could not find the private key configuartion');
    }
    fs.readFileSync(path.resolve(PRIVATE_KEY_PATH));
  } catch (_ex) {
    throw new Error('Could not find the private key configuartion');
  }

  try {
    if (!PUBLIC_KEY_PATH) {
      throw new Error('Could not find the public key configuartion');
    }
    fs.readFileSync(path.resolve(PUBLIC_KEY_PATH));
  } catch (_ex) {
    throw new Error('Could not find the public key configuartion');
  }

  const CORS_OPTIONS = {
    origin: '*',
    optionsSuccessStatus: 200,
    exposedHeaders: ['Content-Disposition', 'X-Filename'], // add 'Content-Disposition' to CORS for download features
  };
  app.options('*', cors() as RequestHandler); // enable pre-flight request. include before other routes
  app.use(cors(CORS_OPTIONS));
}
