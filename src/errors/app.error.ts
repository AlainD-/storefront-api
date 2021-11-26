export default class CustomError {
  message!: string;

  statusCode!: number;

  details?: string;

  constructor(message: string) {
    this.message = message;
  }
}
