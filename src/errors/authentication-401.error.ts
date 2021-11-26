import AppError from './app.error';

export default class Authentication401Error extends AppError {
  constructor(message: string) {
    super(message);
    this.statusCode = 401;
  }
}
