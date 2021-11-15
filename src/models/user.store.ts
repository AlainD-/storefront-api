import Joi, { ValidationResult } from 'joi';
import { User } from './user';
import DatabaseService from '../services/database.service';

export const validateUser = (data: { firstName: string; lastName: string }): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<{ firstName: string; lastName: string }> = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
  });
  return joiSchema.validate(data);
};

export class UserStore {
  static async index(): Promise<User[]> {
    try {
      const query = 'SELECT id, first_name AS "firstName", last_name AS "lastName" FROM users;';

      const users: User[] = await DatabaseService.runQuery<User>(query);
      return users;
    } catch (error) {
      throw new Error(`Could not get the users. Error ${error}`);
    }
  }

  static async show(id: number): Promise<User | undefined> {
    try {
      const query =
        'SELECT id, first_name AS "firstName", last_name AS "lastName" FROM users WHERE id = ($1);';
      const users: User[] = await DatabaseService.runQuery<User>(query, [id]);

      return users[0];
    } catch (error) {
      throw new Error(`Could not find the user ${id}. Error ${error}`);
    }
  }

  static async create(user: Partial<User>): Promise<User> {
    try {
      const { firstName, lastName } = user;
      const password = 'a';
      const query =
        'INSERT INTO users (first_name, last_name, password) VALUES ($1, $2, $3) RETURNING id, first_name AS "firstName", last_name AS "lastName";';
      const users: User[] = await DatabaseService.runQuery<User>(query, [
        firstName,
        lastName,
        password,
      ]);

      return users[0];
    } catch (error) {
      throw new Error(
        `Could not add the new user ${user.firstName} ${user.lastName}. Error ${error}`
      );
    }
  }

  static async update(id: number, data: Partial<User>): Promise<User | undefined> {
    try {
      const { firstName, lastName } = data;
      const password = 'b';
      const query =
        'UPDATE users SET first_name = ($1), last_name = ($2), password = ($3) WHERE id = ($4) RETURNING id, first_name AS "firstName", last_name AS "lastName";';
      const users: User[] = await DatabaseService.runQuery<User>(query, [
        firstName,
        lastName,
        password,
        id,
      ]);

      return users[0];
    } catch (error) {
      throw new Error(`Could not delete the user ${id}. Error ${error}`);
    }
  }

  static async delete(id: number): Promise<User | undefined> {
    try {
      const query =
        'DELETE FROM users WHERE id = ($1) RETURNING id, first_name AS "firstName", last_name AS "lastName";';
      const users: User[] = await DatabaseService.runQuery<User>(query, [id]);

      return users[0];
    } catch (error) {
      throw new Error(`Could not delete the user ${id}. Error ${error}`);
    }
  }
}
