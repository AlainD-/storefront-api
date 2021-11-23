import express, { Router, Request, Response } from 'express';
import { checkAuthenticated, checkIsAdmin } from '../middleware/auth';
import { Order } from '../models/order';
import {
  OrderStore,
  validateCreateOrder,
  validateOrder,
  validateProduct,
} from '../models/order.store';
import { PurchasedProduct } from '../models/purchased-product';
import { isANumber, queryToNumber } from '../services/common-validation.service';

const router: Router = express.Router();
const INVALID_ORDER_ID = 'The order id is not a valid number';
const INVALID_PRODUCT_ID = 'The product id is not a valid number';
const ORDER_NOT_FOUND = 'The order with the given id was not found';

router.get('/', checkIsAdmin, async (_req: Request, res: Response) => {
  let orders: Order[];
  try {
    orders = await OrderStore.index();
  } catch (_error) {
    return res.status(500).send('Could not get the orders');
  }

  return res.send(orders);
});

export default router;
