import AppError from './app.error';

export default class NotFound404Error extends AppError {
  constructor(message: string) {
    super(message);
    this.statusCode = 404;
  }
}
