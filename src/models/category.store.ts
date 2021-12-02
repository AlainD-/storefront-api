import Joi, { ValidationResult } from 'joi';
import DatabaseService from '../services/database.service';
import { Category } from './category';

export const validate = (data: Category): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<Category> = Joi.object({
    id: Joi.number(),
    name: Joi.string().required(),
  });
  return joiSchema.validate(data);
};

export class CategoryStore {
  private columns = 'id, name';

  async index(): Promise<Category[]> {
    try {
      const query = `SELECT ${this.columns} FROM categories;`;

      const categories: Category[] = await DatabaseService.runQuery<Category>(query);
      return categories;
    } catch (error) {
      throw new Error(`Could not get the categories. ${error}`);
    }
  }

  async show(id: number): Promise<Category | undefined> {
    try {
      const query = `SELECT ${this.columns} FROM categories WHERE id = ($1);`;
      const categories: Category[] = await DatabaseService.runQuery<Category>(query, [id]);

      return categories[0];
    } catch (error) {
      throw new Error(`Could not find the category with id ${id}. ${error}`);
    }
  }

  async create(data: { name: string }): Promise<Category | undefined> {
    try {
      const { name } = data;
      const query = `INSERT INTO categories (name) VALUES ($1) RETURNING ${this.columns};`;
      const categories: Category[] = await DatabaseService.runQuery<Category>(query, [name]);

      return categories[0];
    } catch (error) {
      throw new Error(`Could not add the new category. ${error}`);
    }
  }

  async update(id: number, data: { name: string }): Promise<Category | undefined> {
    try {
      const { name } = data;
      const query = `UPDATE categories SET name = ($1) WHERE id = ($2) RETURNING ${this.columns};`;
      const categories: Category[] = await DatabaseService.runQuery<Category>(query, [name, id]);

      return categories[0];
    } catch (error) {
      throw new Error(`Could not update the category with id ${id}. ${error}`);
    }
  }

  async delete(id: number): Promise<Category | undefined> {
    try {
      const query = `DELETE FROM categories WHERE id = ($1) RETURNING ${this.columns};`;
      const categories: Category[] = await DatabaseService.runQuery<Category>(query, [id]);

      return categories[0];
    } catch (error) {
      throw new Error(`Could not delete the category with id ${id}. ${error}`);
    }
  }
}
