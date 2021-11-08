import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

router.all('*', (req: Request, res: Response) => {
  res.status(404).send('The requested API was not found');
});

export default router;
