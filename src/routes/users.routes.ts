import express, { Router, Request, Response } from 'express';
import { checkAuthenticated, checkIsAdmin, checkIsCurrentUser } from '../middleware/auth';
import { Order } from '../models/order';
import { OrderStatus } from '../models/order-status.type';
import {
  OrderStore,
  validateCreateOrder,
  validateOrder,
  validateProduct,
} from '../models/order.store';
import { Product } from '../models/product';
import { ProductStore } from '../models/product.store';
import { PurchasedProduct } from '../models/purchased-product';
import { User } from '../models/user';
import { UserInput } from '../models/user-input';
import { UserStore, validateUser, validateUserInput } from '../models/user.store';
import { isANumber, queryToNumber } from '../services/common-validation.service';

const router: Router = express.Router();
const INVALID_USER_ID = 'The user id is not a valid number';
const INVALID_ORDER_ID = 'The order id is not a valid number';
const INVALID_PRODUCT_ID = 'The product id is not a valid number';
const USER_NOT_FOUND = 'The user with the given id was not found';
const ORDER_NOT_FOUND = 'The order with the given id was not found';
const PRODUCT_NOT_FOUND = 'The product with the given id was not found';

router.get('/', checkIsAdmin, async (_req: Request, res: Response) => {
  let users: User[];
  try {
    users = await UserStore.index();
  } catch (_error) {
    return res.status(500).send('Could not get the users');
  }

  return res.send(users);
});

router.get('/:id', checkIsCurrentUser, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_USER_ID);
  }

  const id: number = queryToNumber(qId);
  const user: User | undefined = await UserStore.show(id);

  if (!user) {
    return res.status(404).send(USER_NOT_FOUND);
  }

  return res.send(user);
});

/**
 * This route is used for new registration
 */
router.post('/', async (req: Request, res: Response) => {
  const { error } = validateUserInput(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  try {
    const { email, firstName, lastName, password } = req.body as UserInput;
    const userFound: User | undefined = await UserStore.showByEmail(email);
    if (userFound) {
      return res.status(400).send('A user already exists with this email');
    }

    const user: User | undefined = await UserStore.create({ email, firstName, lastName, password });

    if (!user) {
      return res.status(500).send('An unexpected error occurred during the creation of the user');
    }

    return res.send(user);
  } catch (err: any) {
    return res
      .status(500)
      .send(`An unexpected error occurred during the creation of the user. ${err?.message ?? ''}`);
  }
});

router.put('/:id', checkIsCurrentUser, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_USER_ID);
  }

  const { error } = validateUser(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  const id: number = queryToNumber(qId);
  const { firstName, lastName, email } = req.body;
  const user: User | undefined = await UserStore.show(id);

  if (!user) {
    return res.status(404).send(USER_NOT_FOUND);
  }

  const updatedUser: User | undefined = await UserStore.update(id, { firstName, lastName, email });

  return res.send(updatedUser);
});

router.delete('/:id', checkIsAdmin, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_USER_ID);
  }

  const id: number = queryToNumber(qId);
  const user: User | undefined = await UserStore.show(id);

  if (!user) {
    return res.status(404).send(USER_NOT_FOUND);
  }

  const deletedUser: User | undefined = await UserStore.delete(id);

  return res.send(deletedUser);
});

router.get('/:userId/orders', checkIsCurrentUser, async (req: Request, res: Response) => {
  const { userId: qUserId } = req.params;
  if (!isANumber(qUserId)) {
    return res.status(400).send(INVALID_USER_ID);
  }

  const userId: number = queryToNumber(qUserId);
  const { status }: { status?: OrderStatus } = req.query;
  const orders: Order[] = await OrderStore.indexUserOrders(userId, { status });

  return res.send(orders);
});

router.get('/:userId/orders/:orderId', checkIsCurrentUser, async (req: Request, res: Response) => {
  const { userId: qUserId, orderId: qOrderId } = req.params;
  if (!isANumber(qUserId)) {
    return res.status(400).send(INVALID_USER_ID);
  }
  if (!isANumber(qOrderId)) {
    return res.status(400).send(INVALID_ORDER_ID);
  }

  const userId: number = queryToNumber(qUserId);
  const orderId: number = queryToNumber(qOrderId);
  const order: Order | undefined = await OrderStore.showUserOrder({ userId, orderId });

  if (!order) {
    return res.status(404).send(ORDER_NOT_FOUND);
  }

  return res.send(order);
});

router.post('/:userId/orders', checkIsCurrentUser, async (req: Request, res: Response) => {
  const { error } = validateCreateOrder(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  try {
    const { userId: qUserId } = req.params;
    const { userId } = req.body as { userId: number };
    if (userId !== +qUserId) {
      return res.status(400).send('Mismatched user ids');
    }
    const activeOrder: Order[] = await OrderStore.indexUserOrders(userId, { status: 'active' });
    if (activeOrder.length > 0) {
      return res.status(400).send('Could not create the order: an active order already exists');
    }

    const order: Order | undefined = await OrderStore.createUserOrder(userId);

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

router.put('/:userId/orders/:orderId', checkIsCurrentUser, async (req: Request, res: Response) => {
  const { userId: qUserId, orderId: qOrderId } = req.params;
  if (!isANumber(qUserId)) {
    return res.status(400).send(INVALID_USER_ID);
  }
  if (!isANumber(qOrderId)) {
    return res.status(400).send(INVALID_ORDER_ID);
  }

  const { error } = validateOrder(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  const order: Order = req.body as Order;
  const { id: orderId, userId, status } = order;
  if (userId !== +qUserId) {
    return res.status(400).send('Mismatched user ids');
  }
  if (orderId !== +qOrderId) {
    return res.status(400).send('Mismatched order ids');
  }

  const existingOrder: Order | undefined = await OrderStore.showUserOrder({ userId, orderId });
  if (!existingOrder) {
    return res.status(404).send(ORDER_NOT_FOUND);
  }
  if (existingOrder.status !== 'active') {
    return res.status(403).send('Updating an order that is not active is not allowed');
  }
  if (status !== 'complete') {
    return res.status(400).send('Invalid status for this operation');
  }

  const updatedOrder: Order | undefined = await OrderStore.updateUserOrder(orderId, {
    userId,
    orderId,
    status,
  });

  return res.send(updatedOrder);
});

router.post(
  '/:userId/orders/:orderId/products',
  checkIsCurrentUser,
  async (req: Request, res: Response) => {
    const { userId: qUserId, orderId: qOrderId } = req.params;
    if (!isANumber(qUserId)) {
      return res.status(400).send(INVALID_USER_ID);
    }
    if (!isANumber(qOrderId)) {
      return res.status(400).send(INVALID_ORDER_ID);
    }

    const { error } = validateProduct(req.body);
    if (error) {
      return res.status(400).send(error.details[0]?.message);
    }

    const userId: number = queryToNumber(qUserId);
    const orderId: number = queryToNumber(qOrderId);
    const order: Order | undefined = await OrderStore.showUserOrder({ userId, orderId });
    if (!order) {
      return res.status(404).send(ORDER_NOT_FOUND);
    }
    if (order.status !== 'active') {
      return res.status(403).send('Updating an order that is not active is not allowed');
    }

    const { productId, quantity } = req.body as { productId: number; quantity: number };
    const product: Product | undefined = await ProductStore.show(productId);
    if (!product) {
      return res.status(404).send(PRODUCT_NOT_FOUND);
    }

    const item: PurchasedProduct | undefined = await OrderStore.addUserOrderProduct({
      userId,
      orderId,
      productId,
      quantity,
    });

    return res.send(item);
  }
);

router.put(
  '/:userId/orders/:orderId/products/:productId',
  checkIsCurrentUser,
  async (req: Request, res: Response) => {
    const { userId: qUserId, orderId: qOrderId, productId: qProductId } = req.params;
    if (!isANumber(qUserId)) {
      return res.status(400).send(INVALID_USER_ID);
    }
    if (!isANumber(qOrderId)) {
      return res.status(400).send(INVALID_ORDER_ID);
    }
    if (!isANumber(qProductId)) {
      return res.status(400).send(INVALID_PRODUCT_ID);
    }

    const { error } = validateProduct(req.body);
    if (error) {
      return res.status(400).send(error.details[0]?.message);
    }

    const userId: number = queryToNumber(qUserId);
    const orderId: number = queryToNumber(qOrderId);
    const order: Order | undefined = await OrderStore.showUserOrder({ userId, orderId });

    if (!order) {
      return res.status(404).send(ORDER_NOT_FOUND);
    }

    const { productId, quantity } = req.body as { productId: number; quantity: number };
    if (+qProductId !== productId) {
      return res.status(400).send('Mismatched product ids');
    }
    const product: Product | undefined = await ProductStore.show(productId);
    if (!product) {
      return res.status(404).send(PRODUCT_NOT_FOUND);
    }

    const item: PurchasedProduct | undefined = await OrderStore.updateUserOrderProduct({
      userId,
      orderId,
      productId,
      quantity,
    });

    return res.send(item);
  }
);

router.delete(
  '/:userId/orders/:orderId/products/:productId',
  checkIsCurrentUser,
  async (req: Request, res: Response) => {
    const { userId: qUserId, orderId: qOrderId, productId: qProductId } = req.params;
    if (!isANumber(qUserId)) {
      return res.status(400).send(INVALID_USER_ID);
    }
    if (!isANumber(qOrderId)) {
      return res.status(400).send(INVALID_ORDER_ID);
    }
    if (!isANumber(qProductId)) {
      return res.status(400).send(INVALID_PRODUCT_ID);
    }

    const { error } = validateProduct(req.body);
    if (error) {
      return res.status(400).send(error.details[0]?.message);
    }

    const userId: number = queryToNumber(qUserId);
    const orderId: number = queryToNumber(qOrderId);
    const productId: number = queryToNumber(qProductId);
    const order: Order | undefined = await OrderStore.showUserOrder({ userId, orderId });
    if (!order) {
      return res.status(404).send(ORDER_NOT_FOUND);
    }

    const product: Product | undefined = await ProductStore.show(productId);
    if (!product) {
      return res.status(404).send(PRODUCT_NOT_FOUND);
    }

    const item: PurchasedProduct | undefined = await OrderStore.deleteUserOrderProduct({
      userId,
      orderId,
      productId,
    });

    return res.send(item);
  }
);

export default router;
