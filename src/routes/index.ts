import express, { Express } from 'express';
import helmet from 'helmet';
import root from './root.routes';
import fallback from './fallback.routes';
import authenticate from './authenticate.routes';
import users from './users.routes';
import categories from './categories.routes';
import products from './products.routes';
import orders from './orders.routes';

export default function routes(app: Express): void {
  app.use(express.json()); // json by default
  app.use(helmet()); // secure app with HTTP headers

  app.use('/', root);
  app.use('/api/v1/authenticate', authenticate);
  app.use('/api/v1/users', users);
  app.use('/api/v1/categories', categories);
  app.use('/api/v1/products', products);
  app.use('/api/v1/orders', orders);

  app.use('*', fallback); // This route must be placed last
}
