import { PoolClient, QueryResult } from 'pg';
import pool from '../database/database';

export default class DatabaseService {
  static async runQuery<T>(query: string, values?: unknown[] | undefined): Promise<T[]> {
    try {
      const connection: PoolClient = await pool.connect();
      const result: QueryResult<T> = await connection.query<T, unknown[]>(query, values);
      connection.release();

      return result.rows;
    } catch (error) {
      throw new Error(
        `An unexpected error occurred while processing the query to the database. ${error}`
      );
    }
  }
}
