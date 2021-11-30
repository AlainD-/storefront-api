import Joi, { ValidationResult } from 'joi';
import DatabaseService from '../services/database.service';
import { Order } from './order';
import { OrderStatus } from './order-status.type';
import { OrderItem } from './order-item';

declare interface OrderRow {
  id: number;
  userId: number;
  status: OrderStatus;
  productId: number;
  quantity: number;
  relationId: number;
}

export const validateCreateOrder = (data: { userId: number }): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<{ userId: number }> = Joi.object({
    userId: Joi.number().required(),
  });
  return joiSchema.validate(data);
};

export const validateOrder = (data: Order): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<Order> = Joi.object({
    id: Joi.number(),
    userId: Joi.number().required(),
    status: Joi.string().valid('active', 'complete').required(),
    items: Joi.array().items(
      Joi.object({
        id: Joi.number(),
        orderId: Joi.number(),
        productId: Joi.number().required(),
        quantity: Joi.number().required(),
      })
    ),
  });
  return joiSchema.validate(data);
};

export const validateOrderItem = (data: {
  productId: number;
  quantity: number;
}): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<{ productId: number; quantity: number }> = Joi.object({
    productId: Joi.number().required(),
    quantity: Joi.number().required(),
  });
  return joiSchema.validate(data);
};

export class OrderStore {
  static orderRowsToOrders(rows: OrderRow[]): Order[] {
    const normalisedOrders: { [id: number]: Order } = rows.reduce<{ [id: number]: Order }>(
      (acc: { [id: number]: Order }, row: OrderRow) => {
        return {
          ...acc,
          [row.id]: {
            id: row.id,
            userId: row.userId,
            status: row.status,
            items: [
              ...(acc[row.id]?.items ?? []),
              ...(row.relationId
                ? [
                    {
                      id: row.relationId,
                      orderId: row.id,
                      productId: row.productId,
                      quantity: row.quantity,
                    },
                  ]
                : []),
            ],
          },
        };
      },
      {}
    );
    return Object.keys(normalisedOrders).map((orderId: string) => normalisedOrders[+orderId]);
  }

  static async index(): Promise<Order[]> {
    try {
      const query = `SELECT o.id, o.user_id AS "userId", o.status, p.product_id AS "productId", p.quantity, p.id AS "relationId"
        FROM orders o
        LEFT JOIN products_in_orders p ON (o.id = p.order_id)
        ORDER BY o.user_id ASC, o.id ASC`;

      const rows: OrderRow[] = await DatabaseService.runQuery<OrderRow>(query);
      return OrderStore.orderRowsToOrders(rows);
    } catch (error) {
      throw new Error(`Could not get the orders. ${error}`);
    }
  }

  static async indexUserOrders(
    userId: number,
    { status }: { status?: OrderStatus }
  ): Promise<Order[]> {
    try {
      const query = `SELECT o.id, o.user_id AS "userId", o.status, p.product_id AS "productId", p.quantity, p.id AS "relationId"
        FROM orders o
        LEFT JOIN products_in_orders p ON (o.id = p.order_id)
        WHERE o.user_id = ($1) ${status ? 'AND status = ($2)' : ''}
        ORDER BY o.status ASC, o.id ASC`;
      const values: (number | OrderStatus)[] = status ? [userId, status] : [userId];
      const rows: OrderRow[] = await DatabaseService.runQuery<OrderRow>(query, values);
      return OrderStore.orderRowsToOrders(rows);
    } catch (error) {
      throw new Error(`Could not get the user's orders. ${error}`);
    }
  }

  static async showUserOrder({
    userId,
    orderId,
  }: {
    userId: number;
    orderId: number;
  }): Promise<Order | undefined> {
    try {
      const query = `SELECT o.id, o.user_id AS "userId", o.status, p.product_id AS "productId", p.quantity, p.id AS "relationId"
        FROM orders o
        LEFT JOIN products_in_orders p ON (o.id = p.order_id)
        WHERE o.user_id = ($1) AND o.id = ($2)
        ORDER BY o.user_id ASC, o.id ASC`;
      const rows: OrderRow[] = await DatabaseService.runQuery<OrderRow>(query, [userId, orderId]);
      const orders: Order[] = OrderStore.orderRowsToOrders(rows);

      return orders[0];
    } catch (error) {
      throw new Error(`Could not find the user's order with id ${orderId}. ${error}`);
    }
  }

  static async createUserOrder(userId: number): Promise<Order | undefined> {
    try {
      const query = `INSERT INTO orders (user_id, status)
        VALUES ($1, $2)
        RETURNING id, user_id AS "userId", status;`;
      const activeStatus: OrderStatus = 'active';
      const orders: Order[] = await DatabaseService.runQuery<Order>(query, [userId, activeStatus]);

      return orders[0];
    } catch (error) {
      throw new Error(`Could not add the new user's order. ${error}`);
    }
  }

  static async updateUserOrder(
    id: number,
    { userId, status }: { userId: number; status: OrderStatus }
  ): Promise<Order | undefined> {
    try {
      if (status === 'complete') {
        const query =
          'UPDATE orders SET status = ($1) WHERE id = ($2) AND user_id = ($3) AND status = ($4) RETURNING id, user_id AS "userId", status;';
        const orders: Order[] = await DatabaseService.runQuery<Order>(query, [
          status,
          id,
          userId,
          'active',
        ]);
        return orders[0];
      }
      return undefined;
    } catch (error) {
      throw new Error(`Could not update the user's order with id ${id}. ${error}`);
    }
  }

  static async showUserOrderItem(id: number): Promise<OrderItem | undefined> {
    try {
      const query = `SELECT id, product_id AS "productId", order_id AS "orderId", quantity
        FROM products_in_orders
        WHERE id = ($1)`;
      const items: OrderItem[] = await DatabaseService.runQuery<OrderItem>(query, [id]);

      return items[0];
    } catch (error) {
      throw new Error(`Could not find the order item with id ${id}. ${error}`);
    }
  }

  static async addUserOrderItem({
    userId,
    orderId,
    productId,
    quantity,
  }: {
    userId: number;
    orderId: number;
    productId: number;
    quantity: number;
  }): Promise<OrderItem | undefined> {
    try {
      // validate that the product is not in the order yet!
      // validate that the order is still active!
      const query = `INSERT INTO products_in_orders (order_id, product_id, quantity)
        SELECT o.id, $1, $2
        FROM orders o
        LEFT JOIN products_in_orders po ON (o.id = po.order_id)
        WHERE o.user_id = ($3)
        AND o.id = ($4)
        AND o.status = ($5)
        AND (po.product_id IS NULL OR po.product_id NOT IN ($6))
        LIMIT 1
        RETURNING id, order_id AS "orderId", product_id AS "productId", quantity;`;
      const rows: OrderItem[] = await DatabaseService.runQuery<OrderItem>(query, [
        productId,
        quantity,
        userId,
        orderId,
        'active',
        productId,
      ]);

      return rows[0];
    } catch (error) {
      throw new Error(
        `Could not add the product id ${productId} to the user's order id ${orderId}. ${error}`
      );
    }
  }

  static async updateUserOrderItem(
    id: number,
    {
      userId,
      orderId,
      productId,
      quantity,
    }: {
      userId: number;
      orderId: number;
      productId: number;
      quantity: number;
    }
  ): Promise<OrderItem | undefined> {
    try {
      // validate that the product is in the order already!
      // validate that the order is still active!
      const query = `UPDATE products_in_orders
        SET quantity = ($1)
        WHERE id = ($1) AND product_id = ($2) AND order_id IN (
          SELECT id
          FROM orders
          WHERE user_id = ($3) AND order_id = ($4) AND status = ($5)
        )
        RETURNING id, order_id AS "orderId", product_id AS "productId", quantity;`;
      const rows: OrderItem[] = await DatabaseService.runQuery<OrderItem>(query, [
        quantity,
        id,
        productId,
        userId,
        orderId,
        'active',
      ]);

      return rows[0];
    } catch (error) {
      throw new Error(
        `Could not update the product id ${productId} in the user's order id ${orderId}. ${error}`
      );
    }
  }

  static async deleteUserOrderItem(
    id: number,
    {
      userId,
      orderId,
    }: {
      userId: number;
      orderId: number;
    }
  ): Promise<OrderItem | undefined> {
    try {
      // @todo validate that the order is still active!
      const query = `DELETE FROM products_in_orders
        WHERE id = ($1) AND order_id IN (
          SELECT id
          FROM orders
          WHERE user_id = ($2) AND id = ($3) AND status = ($4)
        )
        RETURNING id, order_id AS "orderId", product_id AS "productId", quantity;`;
      const rows: OrderItem[] = await DatabaseService.runQuery<OrderItem>(query, [
        id,
        userId,
        orderId,
        'active',
      ]);

      return rows[0];
    } catch (error) {
      throw new Error(
        `Could not delete the order item id ${id} from the user's order id ${orderId}. ${error}`
      );
    }
  }
}
