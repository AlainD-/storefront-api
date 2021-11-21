import Joi, { ValidationResult } from 'joi';
import DatabaseService from '../services/database.service';
import { Product } from './product';
import { ProductInput } from './product-input';

export const validate = (data: ProductInput): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<ProductInput> = Joi.object({
    id: Joi.number(),
    name: Joi.string().max(255).required(),
    price: Joi.number().required(),
    category: Joi.string().max(100).allow(null),
  });
  return joiSchema.validate(data);
};

export class ProductStore {
  static async index(): Promise<Product[]> {
    try {
      const query = 'SELECT id, name, price, category FROM products;';

      const products: Product[] = await DatabaseService.runQuery<Product>(query);
      return products;
    } catch (error) {
      throw new Error(`Could not get the products. ${error}`);
    }
  }

  static async show(id: number): Promise<Product | undefined> {
    try {
      const query = 'SELECT id, name, price, category FROM products WHERE id = ($1);';
      const products: Product[] = await DatabaseService.runQuery<Product>(query, [id]);

      return products[0];
    } catch (error) {
      throw new Error(`Could not find the product with id ${id}. ${error}`);
    }
  }

  static async create(productInput: ProductInput): Promise<Product | undefined> {
    try {
      const { name, price, category } = productInput;
      const values: (string | number)[] = [name, price];
      const columns: string[] = ['name', 'price'];
      const queryValues: string[] = ['$1', '$2'];

      if (category) {
        values.push(category);
        columns.push('category');
        queryValues.push('$3');
      }
      const query = `INSERT INTO products (${columns.join(', ')})
        VALUES (${queryValues.join(', ')})
        RETURNING id, name, price, category;`;
      const products: Product[] = await DatabaseService.runQuery<Product>(query, values);

      return products[0];
    } catch (error) {
      throw new Error(`Could not add the new product. ${error}`);
    }
  }

  static async update(id: number, data: ProductInput): Promise<Product | undefined> {
    try {
      const { name, price, category } = data;
      const values: (string | number | undefined)[] = category
        ? [name, price, category]
        : [name, price];
      const query = category
        ? 'UPDATE products SET name = ($1), price = ($2), category = ($3) WHERE id = ($4) RETURNING id, name, price, category;'
        : 'UPDATE products SET name = ($1), price = ($2) WHERE id = ($3) RETURNING id, name, price, category;';
      const products: Product[] = await DatabaseService.runQuery<Product>(query, [...values, id]);

      return products[0];
    } catch (error) {
      throw new Error(`Could not update the product with id ${id}. ${error}`);
    }
  }

  static async delete(id: number): Promise<Product | undefined> {
    try {
      const query = 'DELETE FROM products WHERE id = ($1) RETURNING id, name, price, category;';
      const products: Product[] = await DatabaseService.runQuery<Product>(query, [id]);

      return products[0];
    } catch (error) {
      throw new Error(`Could not delete the product with id ${id}. ${error}`);
    }
  }
}
