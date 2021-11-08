import 'express-async-errors';
import winston from 'winston';

export default function logging(): void {
  winston.exceptions.handle(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.prettyPrint()
      ),
    }),
    new winston.transports.File({ filename: 'exceptions.log' })
  );

  process.on('unhandledRejection', (ex: any): void => {
    if (ex instanceof Error) {
      throw ex;
    } else {
      throw new Error('Error: An unhandled rejection occurred!');
    }
  });
}
