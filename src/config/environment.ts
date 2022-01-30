import { Algorithm as JWTAlgorithm } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const {
  JWT_TOKEN_SECRET = '',
  BCRYPT_PASSWORD,
  SALT_ROUNDS,
  PORT,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_DB_TEST,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_PASSWORD_TEST,
  NODE_ENV,
} = process.env;

if (
  !JWT_TOKEN_SECRET ||
  !BCRYPT_PASSWORD ||
  !SALT_ROUNDS ||
  !POSTGRES_HOST ||
  !POSTGRES_PORT ||
  !POSTGRES_DB ||
  !POSTGRES_DB_TEST ||
  !POSTGRES_USER ||
  !POSTGRES_PASSWORD ||
  !POSTGRES_PASSWORD_TEST
) {
  throw new Error(
    'One or multiple mandatory configuration is or are missing. Please refer to the README.md documentation for detailed instructions.'
  );
}

const ENV: string | undefined = NODE_ENV?.trim();

const JWT_ALGORITHM: JWTAlgorithm = 'HS256';

export {
  JWT_ALGORITHM,
  JWT_TOKEN_SECRET,
  BCRYPT_PASSWORD,
  SALT_ROUNDS,
  PORT,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_DB_TEST,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_PASSWORD_TEST,
  ENV,
};
