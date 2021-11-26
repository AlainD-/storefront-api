import AppError from './app.error';

export default class BadRequest400Error extends AppError {
  constructor(message: string) {
    super(message);
    this.statusCode = 400;
  }
}
