import { Pool } from 'pg';
import {
  ENV,
  POSTGRES_DB,
  POSTGRES_DB_TEST,
  POSTGRES_HOST,
  POSTGRES_PASSWORD,
  POSTGRES_PASSWORD_TEST,
  POSTGRES_PORT,
  POSTGRES_USER,
} from '../config/environment';

const pool: Pool = new Pool({
  host: POSTGRES_HOST,
  port: POSTGRES_PORT as number | undefined,
  database: ENV === 'test' ? POSTGRES_DB_TEST : POSTGRES_DB,
  user: POSTGRES_USER,
  password: ENV === 'test' ? POSTGRES_PASSWORD_TEST : POSTGRES_PASSWORD,
});

export default pool;
