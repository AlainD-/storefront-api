import { createLogger, transports, format, Logger } from 'winston';

const logger: Logger = createLogger({
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.File({
      filename: 'logfile.log',
      level: 'error',
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
});

export default logger;
