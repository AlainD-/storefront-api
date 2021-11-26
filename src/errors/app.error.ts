export default class CustomError extends Error {
  statusCode!: number;

  details?: string;
}
