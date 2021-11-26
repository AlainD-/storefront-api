import express, { Router, Request, Response } from 'express';
import NotFound404Error from '../errors/not-found-404.error';

const router: Router = express.Router();

router.all('*', (req: Request, res: Response) => {
  res.status(404).send(new NotFound404Error('The requested API was not found'));
});

export default router;
