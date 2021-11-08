import express, { Express } from 'express';
import helmet from 'helmet';
import root from './root.routes';
import fallback from './fallback.routes';

export default function routes(app: Express): void {
  app.use(express.json()); // json by default
  app.use(helmet()); // secure app with HTTP headers
  app.use('/', root);
  app.use('*', fallback); // This route must be placed last
}
