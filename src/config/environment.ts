import { Algorithm as JWTAlgorithm } from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const {
  PRIVATE_KEY_PATH,
  PUBLIC_KEY_PATH,
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
  !PRIVATE_KEY_PATH ||
  !PUBLIC_KEY_PATH ||
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

let rsaPrivateKey: Buffer | null = null;
let rsaPublicKey: Buffer | null = null;
try {
  if (!PRIVATE_KEY_PATH) {
    throw new Error('Could not find the private key configuartion');
  }
  rsaPrivateKey = fs.readFileSync(path.resolve(PRIVATE_KEY_PATH));
} catch (_ex) {
  throw new Error('Could not find the private key configuartion');
}
try {
  if (!PUBLIC_KEY_PATH) {
    throw new Error('Could not find the public key configuartion');
  }
  rsaPublicKey = fs.readFileSync(path.resolve(PUBLIC_KEY_PATH));
} catch (_ex) {
  throw new Error('Could not find the public key configuartion');
}

const RSA_PRIVATE_KEY: Buffer = rsaPrivateKey;
const RSA_PUBLIC_KEY: Buffer = rsaPublicKey;
const ENV: string | undefined = NODE_ENV?.trim();

const JWT_ALGORITHM: JWTAlgorithm = 'RS256';

export {
  PRIVATE_KEY_PATH,
  PUBLIC_KEY_PATH,
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
  RSA_PRIVATE_KEY,
  RSA_PUBLIC_KEY,
  JWT_ALGORITHM,
};
