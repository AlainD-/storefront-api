import { OrderStatus } from './order-status.type';
import { PurchasedProduct } from './purchased-product';

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  products?: PurchasedProduct[];
}
