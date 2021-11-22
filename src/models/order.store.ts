import Joi, { ValidationResult } from 'joi';
import DatabaseService from '../services/database.service';
import { Order } from './order';
import { OrderStatus } from './order-status.type';
import { PurchasedProduct } from './purchased-product';

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
    products: Joi.array().items(
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

export const validateProduct = (data: {
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
            products: [
              ...(acc[row.id]?.products ?? []),
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

  static async show(id: number): Promise<Order | undefined> {
    try {
      const query = `SELECT o.id, o.user_id AS "userId", o.status, p.product_id AS "productId", p.quantity, p.id AS "relationId"
        FROM orders o
        LEFT JOIN products_in_orders p ON (o.id = p.order_id)
        WHERE o.id = ($1)
        ORDER BY o.user_id ASC, o.id ASC`;
      const rows: OrderRow[] = await DatabaseService.runQuery<OrderRow>(query, [id]);
      const orders: Order[] = OrderStore.orderRowsToOrders(rows);

      return orders[0];
    } catch (error) {
      throw new Error(`Could not find the order with id ${id}. ${error}`);
    }
  }

  static async create(userId: number): Promise<Order | undefined> {
    try {
      const query = `INSERT INTO orders (user_id, status)
        VALUES ($1, $2)
        RETURNING id, user_id AS "userId", status;`;
      const activeStatus: OrderStatus = 'active';
      const orders: Order[] = await DatabaseService.runQuery<Order>(query, [userId, activeStatus]);

      return orders[0];
    } catch (error) {
      throw new Error(`Could not add the new order. ${error}`);
    }
  }

  static async update(id: number, data: Order): Promise<Order | undefined> {
    try {
      const { userId, status } = data;
      if (status === 'complete') {
        const query =
          'UPDATE orders SET status = ($1) WHERE id = ($2) AND user_id = ($3) RETURNING id, user_id AS "userId", status;';
        const orders: Order[] = await DatabaseService.runQuery<Order>(query, [status, id, userId]);
        return orders[0];
      }
      return undefined;
    } catch (error) {
      throw new Error(`Could not update the order with id ${id}. ${error}`);
    }
  }

  static async addProduct({
    orderId,
    productId,
    quantity,
  }: {
    orderId: number;
    productId: number;
    quantity: number;
  }): Promise<PurchasedProduct | undefined> {
    try {
      // @todo validate that the product is not in the order yet!
      // @todo validate that the order is still active!
      const query = `INSERT INTO products_in_orders (order_id, product_id, quantity)
        VALUES ($1, $2, $3)
        RETURNING id, order_id AS "orderId", product_id AS "productId", quantity;`;
      const rows: PurchasedProduct[] = await DatabaseService.runQuery<PurchasedProduct>(query, [
        orderId,
        productId,
        quantity,
      ]);

      return rows[0];
    } catch (error) {
      throw new Error(`Could not add the product for the order id ${orderId}. ${error}`);
    }
  }

  static async updateProduct({
    orderId,
    productId,
    quantity,
  }: {
    orderId: number;
    productId: number;
    quantity: number;
  }): Promise<PurchasedProduct | undefined> {
    try {
      // @todo validate that the product is in the order already!
      // @todo validate that the order is still active!
      const values: number[] =
        quantity <= 0 ? [orderId, productId] : [quantity, orderId, productId];
      const query =
        quantity <= 0
          ? `DELETE FROM products_in_orders
          WHERE order_id = ($1) AND product_id = ($2)
          RETURNING id, order_id AS "orderId", product_id AS "productId", quantity;`
          : `UPDATE products_in_orders
          SET quantity = ($1)
          WHERE order_id = ($2) AND product_id = ($3)
          RETURNING id, order_id AS "orderId", product_id AS "productId", quantity;`;
      const rows: PurchasedProduct[] = await DatabaseService.runQuery<PurchasedProduct>(
        query,
        values
      );

      return rows[0];
    } catch (error) {
      throw new Error(`Could not update the product in the order id ${orderId}. ${error}`);
    }
  }
}
