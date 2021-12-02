import Joi, { ValidationResult } from 'joi';
import DatabaseService from '../services/database.service';
import { Product } from './product';
import { ProductInput } from './product-input';

export const validate = (data: ProductInput): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<ProductInput> = Joi.object({
    id: Joi.number(),
    name: Joi.string().max(255).required(),
    price: Joi.number().positive().required(),
    categoryId: Joi.number().required(),
    imageUrl: Joi.string().allow(null),
  });
  return joiSchema.validate(data);
};

export class ProductStore {
  private columns = 'id, name, price, category_id AS "categoryId", image_url AS "imageUrl"';

  async index({ categoryId }: { categoryId?: number }): Promise<Product[]> {
    try {
      const query = `SELECT ${this.columns}
        FROM products
        ${categoryId ? 'WHERE category_id = ($1)' : ''};`;
      const values: number[] | undefined = categoryId ? [categoryId] : undefined;

      const products: Product[] = await DatabaseService.runQuery<Product>(query, values);
      return products;
    } catch (error) {
      throw new Error(`Could not get the products. ${error}`);
    }
  }

  async show(id: number): Promise<Product | undefined> {
    try {
      const query = `SELECT ${this.columns} FROM products WHERE id = ($1);`;
      const products: Product[] = await DatabaseService.runQuery<Product>(query, [id]);

      return products[0];
    } catch (error) {
      throw new Error(`Could not find the product with id ${id}. ${error}`);
    }
  }

  async create(productInput: ProductInput): Promise<Product | undefined> {
    try {
      const { name, price, categoryId, imageUrl } = productInput;
      const columns = 'name, price, category_id, image_url';
      const params = imageUrl ? '$1, $2, $3, $4' : '$1, $2, $3, NULL';
      const values: (string | number)[] = imageUrl
        ? [name, price, categoryId, imageUrl]
        : [name, price, categoryId];
      const query = `INSERT INTO products (${columns}) VALUES (${params}) RETURNING ${this.columns};`;
      const products: Product[] = await DatabaseService.runQuery<Product>(query, values);

      return products[0];
    } catch (error) {
      throw new Error(`Could not add the new product. ${error}`);
    }
  }

  async update(id: number, data: ProductInput): Promise<Product | undefined> {
    try {
      const { name, price, categoryId, imageUrl } = data;
      const query = `UPDATE products
        SET name = ($1), price = ($2), category_id = ($3), image_url = ${imageUrl ? '($5)' : 'NULL'}
        WHERE id = ($4)
        RETURNING ${this.columns};`;
      const values: (string | number)[] = imageUrl
        ? [name, price, categoryId, id, imageUrl]
        : [name, price, categoryId, id];
      const products: Product[] = await DatabaseService.runQuery<Product>(query, values);

      return products[0];
    } catch (error) {
      throw new Error(`Could not update the product with id ${id}. ${error}`);
    }
  }

  async delete(id: number): Promise<Product | undefined> {
    try {
      const query = `DELETE FROM products WHERE id = ($1) RETURNING ${this.columns};`;
      const products: Product[] = await DatabaseService.runQuery<Product>(query, [id]);

      return products[0];
    } catch (error) {
      throw new Error(`Could not delete the product with id ${id}. ${error}`);
    }
  }
}
