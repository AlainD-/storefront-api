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

router.get('/:id', checkIsAdmin, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_ORDER_ID);
  }

  const id: number = queryToNumber(qId);
  const order: Order | undefined = await OrderStore.show(id);

  if (!order) {
    return res.status(404).send(ORDER_NOT_FOUND);
  }

  return res.send(order);
});

router.post('/', checkAuthenticated, async (req: Request, res: Response) => {
  const { error } = validateCreateOrder(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  try {
    const { userId } = req.body as { userId: number };
    // @todo check if there is already an active order for that user
    const order: Order | undefined = await OrderStore.create(userId);

    if (!order) {
      return res.status(500).send('An unexpected error occurred during the creation of the order');
    }

    return res.send(order);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return res
      .status(500)
      .send(`An unexpected error occurred during the creation of the order. ${err?.message ?? ''}`);
  }
});

router.put('/:id', checkAuthenticated, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_ORDER_ID);
  }

  const { error } = validateOrder(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  const id: number = queryToNumber(qId);
  const { id: orderId, userId, status } = req.body as Order;

  if (id !== orderId) {
    return res.status(400).send('Mismatched order ids');
  }

  const order: Order | undefined = await OrderStore.show(id);

  if (!order) {
    return res.status(404).send(ORDER_NOT_FOUND);
  }

  // @todo validate that a user can only update his/her own order
  const updatedOrder: Order | undefined = await OrderStore.update(id, { id, userId, status });

  return res.send(updatedOrder);
});

router.post('/:id/products', checkAuthenticated, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_ORDER_ID);
  }

  const { error } = validateProduct(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  const id: number = queryToNumber(qId);
  const order: Order | undefined = await OrderStore.show(id);

  if (!order) {
    return res.status(404).send(ORDER_NOT_FOUND);
  }

  // @todo validate that a user can only update his/her own order
  const { productId, quantity } = req.body as { productId: number; quantity: number };
  const product: PurchasedProduct | undefined = await OrderStore.addProduct({
    orderId: id,
    productId,
    quantity,
  });

  return res.send(product);
});

router.put('/:id/products/:productId', checkAuthenticated, async (req: Request, res: Response) => {
  const { id: qId, productId: qProductId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_ORDER_ID);
  }
  if (!isANumber(qProductId)) {
    return res.status(400).send(INVALID_PRODUCT_ID);
  }

  const { error } = validateProduct(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  const id: number = queryToNumber(qId);
  const order: Order | undefined = await OrderStore.show(id);

  if (!order) {
    return res.status(404).send(ORDER_NOT_FOUND);
  }

  const { productId, quantity } = req.body as { productId: number; quantity: number };
  if (+qProductId !== productId) {
    return res.status(400).send('Mismatched product ids');
  }

  // @todo validate that a user can only update his/her own order
  const product: PurchasedProduct | undefined = await OrderStore.updateProduct({
    orderId: id,
    productId,
    quantity,
  });

  return res.send(product);
});

export default router;
