import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { BCRYPT_PASSWORD, SALT_ROUNDS, RSA_PRIVATE_KEY } from '../config/environment';
import { User } from '../models/user';

export const hash$ = (password: string): Promise<string> =>
  bcrypt.hash(`${password}${BCRYPT_PASSWORD}`, parseInt(SALT_ROUNDS as string, 10));

export const isSamePassword$ = (plainPassword: string, encrypted: string): Promise<boolean> =>
  bcrypt.compare(`${plainPassword}${BCRYPT_PASSWORD}`, encrypted);

export const getJWTToken = (user: User): string => {
  const permissions: string[] = [];
  const roles: string[] = [];
  if (user.isAdmin) {
    roles.push('admin');
  }
  const expiresIn = '1d';
  return jwt.sign(
    {
      roles,
      permissions,
      userId: user.id,
    },
    RSA_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      expiresIn,
      subject: user.email,
    }
  );
};
