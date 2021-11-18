import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import Joi, { ValidationResult } from 'joi';
import { User } from './user';
import { UserInput } from './user-input';
import DatabaseService from '../services/database.service';

dotenv.config();

const { BCRYPT_PASSWORD, SALT_ROUNDS } = process.env;

export const validateUserInput = (data: UserInput): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<UserInput> = Joi.object({
    email: Joi.string().min(3).max(255).email({ tlds: false }).required(),
    firstName: Joi.string().max(50).required(),
    lastName: Joi.string().max(100).required(),
    password: Joi.string().max(255).required(),
  });
  return joiSchema.validate(data);
};

export const validateUser = (data: Partial<User>): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<Partial<User>> = Joi.object({
    email: Joi.string().min(3).max(255).email({ tlds: false }).required(),
    firstName: Joi.string().max(50).required(),
    lastName: Joi.string().max(100).required(),
    isAdmin: Joi.boolean().allow(null),
  });
  return joiSchema.validate(data);
};

export class UserStore {
  static async hash$(password: string): Promise<string> {
    const hashed: string = await bcrypt.hash(
      `${password}${BCRYPT_PASSWORD}`,
      parseInt(SALT_ROUNDS as string, 10)
    );
    return hashed;
  }

  static async index(): Promise<User[]> {
    try {
      const query =
        'SELECT id, email, first_name AS "firstName", last_name AS "lastName", is_admin AS "isAdmin" FROM users;';

      const users: User[] = await DatabaseService.runQuery<User>(query);
      return users;
    } catch (error) {
      throw new Error(`Could not get the users. ${error}`);
    }
  }

  static async show(id: number): Promise<User | undefined> {
    try {
      const query =
        'SELECT id, email, first_name AS "firstName", last_name AS "lastName", is_admin AS "isAdmin" FROM users WHERE id = ($1);';
      const users: User[] = await DatabaseService.runQuery<User>(query, [id]);

      return users[0];
    } catch (error) {
      throw new Error(`Could not find the user with id ${id}. ${error}`);
    }
  }

  static async showByEmail(email: string): Promise<User | undefined> {
    try {
      const query =
        'SELECT id, email, first_name AS "firstName", last_name AS "lastName", is_admin AS "isAdmin" FROM users WHERE email = ($1);';
      const users: User[] = await DatabaseService.runQuery<User>(query, [email]);

      return users[0];
    } catch (error) {
      throw new Error(`Could not find the user with email ${email}. ${error}`);
    }
  }

  static async create(userInput: UserInput): Promise<User | undefined> {
    try {
      const { email, firstName, lastName, password } = userInput;
      const isAdmin = 0; // Forbidden to create admin user directly
      const hashedPassword: string = await UserStore.hash$(password);
      const query =
        'INSERT INTO users (first_name, last_name, password, email, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name AS "firstName", last_name AS "lastName", is_admin AS "isAdmin";';
      const users: User[] = await DatabaseService.runQuery<User>(query, [
        firstName,
        lastName,
        hashedPassword,
        email,
        isAdmin,
      ]);

      return users[0];
    } catch (error) {
      throw new Error(`Could not add the new user. ${error}`);
    }
  }

  static async update(id: number, data: Partial<User>): Promise<User | undefined> {
    try {
      const { email, firstName, lastName } = data;
      const query =
        'UPDATE users SET first_name = ($1), last_name = ($2), email = ($3) WHERE id = ($4) RETURNING id, email, first_name AS "firstName", last_name AS "lastName", is_admin AS "isAdmin";';
      const users: User[] = await DatabaseService.runQuery<User>(query, [
        firstName,
        lastName,
        email,
        id,
      ]);

      return users[0];
    } catch (error) {
      throw new Error(`Could not update the user with id ${id}. ${error}`);
    }
  }

  static async delete(id: number): Promise<User | undefined> {
    try {
      const query =
        'DELETE FROM users WHERE id = ($1) RETURNING id, email, first_name AS "firstName", last_name AS "lastName", is_admin AS "isAdmin";';
      const users: User[] = await DatabaseService.runQuery<User>(query, [id]);

      return users[0];
    } catch (error) {
      throw new Error(`Could not delete the user with id ${id}. ${error}`);
    }
  }
}
