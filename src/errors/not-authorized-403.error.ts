import AppError from './app.error';

export default class NotAuthorized403Error extends AppError {
  constructor(message: string) {
    super(message);
    this.statusCode = 403;
  }
}
