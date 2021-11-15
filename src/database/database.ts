import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_DB_TEST,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_PASSWORD_TEST,
  NODE_ENV,
} = process.env;
const ENV: string | undefined = NODE_ENV?.trim();

const pool: Pool = new Pool({
  host: POSTGRES_HOST,
  port: POSTGRES_PORT as number | undefined,
  database: ENV === 'test' ? POSTGRES_DB_TEST : POSTGRES_DB,
  user: POSTGRES_USER,
  password: ENV === 'test' ? POSTGRES_PASSWORD_TEST : POSTGRES_PASSWORD,
});

export default pool;
