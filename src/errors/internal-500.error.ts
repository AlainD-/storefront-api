import AppError from './app.error';

export default class Internal500Error extends AppError {
  constructor(message: string, details?: string) {
    super(message);
    this.statusCode = 500;
    this.details = details;
  }
}
