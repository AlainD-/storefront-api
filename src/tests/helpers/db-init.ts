import DatabaseService from '../../services/database.service';
import { Category } from '../../models/category';
import { Order } from '../../models/order';
import { OrderItem } from '../../models/order-item';
import { OrderStatus } from '../../models/order-status.type';
import { Product } from '../../models/product';
import { User } from '../../models/user';

export const deleteAllUsers = async (): Promise<void> => {
  const query = 'DELETE FROM users;';
  await DatabaseService.runQuery<User>(query);
};

export const insertUser = async (email = 'd@d.d'): Promise<User> => {
  const query =
    'INSERT INTO users (first_name, last_name, password, email) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name AS "firstName", last_name AS "lastName", is_admin AS "isAdmin";';
  const users: User[] = await DatabaseService.runQuery<User>(query, ['a', 'b', 'c', email]);
  return users[0];
};

export const maxUserId = async (): Promise<number> => {
  const query = `SELECT NEXTVAL(pg_get_serial_sequence('users', 'id')) AS "maxId";`;
  const ids: { maxId: string }[] = await DatabaseService.runQuery<{ maxId: string }>(query);
  return parseInt(ids[0]?.maxId, 10);
};

export const deleteAllCategories = async (): Promise<void> => {
  const query = 'DELETE FROM categories;';
  await DatabaseService.runQuery<Category>(query);
};

export const insertCategory = async (name = 'c'): Promise<Category> => {
  const query = 'INSERT INTO categories (name) VALUES ($1) RETURNING id, name;';
  const categories: Category[] = await DatabaseService.runQuery<Category>(query, [name]);
  return categories[0];
};

export const maxCategoryId = async (): Promise<number> => {
  const query = `SELECT NEXTVAL(pg_get_serial_sequence('categories', 'id')) AS "maxId";`;
  const ids: { maxId: string }[] = await DatabaseService.runQuery<{ maxId: string }>(query);
  return parseInt(ids[0]?.maxId, 10);
};

export const deleteAllProducts = async (): Promise<void> => {
  const query = 'DELETE FROM products;';
  await DatabaseService.runQuery<Product>(query);
};

export const insertProduct = async (categoryId: number): Promise<Product> => {
  const query = `INSERT INTO products (name, price, category_id, image_url)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, price, category_id AS "categoryId", image_url AS "imageUrl";`;
  const values: (string | number)[] = ['a', 1, categoryId, 'b'];
  const products: Product[] = await DatabaseService.runQuery<Product>(query, values);
  return products[0];
};

export const maxProductId = async (): Promise<number> => {
  const query = `SELECT NEXTVAL(pg_get_serial_sequence('products', 'id')) AS "maxId";`;
  const ids: { maxId: string }[] = await DatabaseService.runQuery<{ maxId: string }>(query);
  return parseInt(ids[0]?.maxId, 10);
};

export const deleteAllOrders = async (): Promise<void> => {
  const query = 'DELETE FROM orders;';
  await DatabaseService.runQuery<Order>(query);
};

export const insertOrder = async (
  userId: number,
  status: OrderStatus = 'active'
): Promise<Order> => {
  const query =
    'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING id, user_id AS "userId", status;';
  const orders: Order[] = await DatabaseService.runQuery<Order>(query, [userId, status]);
  return { ...orders[0], items: [] };
};

export const deleteAllOrderItems = async (): Promise<void> => {
  const query = 'DELETE FROM products_in_orders;';
  await DatabaseService.runQuery<OrderItem>(query);
};

export const insertOrderItem = async ({
  orderId,
  productId,
  quantity = 0,
}: {
  orderId: number;
  productId: number;
  quantity?: number;
}): Promise<OrderItem> => {
  const query =
    'INSERT INTO products_in_orders (order_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING id, order_id AS "orderId", product_id AS "productId", quantity;';
  const items: OrderItem[] = await DatabaseService.runQuery<OrderItem>(query, [
    orderId,
    productId,
    quantity,
  ]);
  return items[0];
};
