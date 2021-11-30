import { OrderStatus } from './order-status.type';
import { OrderItem } from './order-item';

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  items?: OrderItem[];
}
