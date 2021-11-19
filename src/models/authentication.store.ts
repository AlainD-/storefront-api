import Joi, { ValidationResult } from 'joi';
import { Credentials } from './credentials';
import { User } from './user';
import DatabaseService from '../services/database.service';
import { isSamePassword$ } from '../services/security.service';

declare interface UnsecureUserWithPassword extends User {
  password?: string;
}

export const validate = (data: Credentials): ValidationResult => {
  const joiSchema: Joi.ObjectSchema<Credentials> = Joi.object({
    email: Joi.string().email({ tlds: false }).required(),
    password: Joi.string().required(),
  });
  return joiSchema.validate(data);
};

export class AuthenticationStore {
  static async authenticate(credentials: Credentials): Promise<User | null> {
    try {
      const { email, password } = credentials;

      const query =
        'SELECT id, email, first_name AS "firstName", last_name AS "lastName", is_admin AS "isAdmin", password FROM users WHERE email = ($1);';
      const unsecuredUsers: UnsecureUserWithPassword[] =
        await DatabaseService.runQuery<UnsecureUserWithPassword>(query, [email]);

      if (!unsecuredUsers.length || !unsecuredUsers[0].password) {
        return null;
      }

      const hashedPassword: string = unsecuredUsers[0].password;
      if (await isSamePassword$(password, hashedPassword)) {
        // @note: remove the password before returning the user
        const userCopy: UnsecureUserWithPassword = { ...unsecuredUsers[0], password: undefined };
        const user: User = { ...userCopy };
        return user;
      }

      return null;
    } catch (error) {
      throw new Error(`Could not authenticate the user. ${error}`);
    }
  }
}
