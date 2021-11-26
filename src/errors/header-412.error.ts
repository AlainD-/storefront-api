import AppError from './app.error';

export default class Header412Error extends AppError {
  constructor(message: string) {
    super(message);
    this.statusCode = 412;
  }
}
