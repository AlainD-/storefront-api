import express, { Router, Request, Response } from 'express';
import Internal500Error from '../errors/internal-500.error';
import { checkIsAdmin } from '../middleware/auth';
import { Order } from '../models/order';
import { OrderStore } from '../models/order.store';

const router: Router = express.Router();

router.get('/', checkIsAdmin, async (_req: Request, res: Response) => {
  let orders: Order[];
  try {
    orders = await OrderStore.index();
  } catch (_error) {
    return res.status(500).send(new Internal500Error('Could not get the orders'));
  }

  return res.send(orders);
});

export default router;
