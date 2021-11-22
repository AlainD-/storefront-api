import jwt, { JsonWebTokenError, JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { RSA_PUBLIC_KEY } from '../config/environment';

export function checkAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Response<any, Record<string, any>> | void {
  try {
    const authorizationHeader: string | undefined = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).send('The Authorization header was missing');
    }
    const authHeaderParts: string[] = authorizationHeader.split(' ');
    if (authHeaderParts.length < 2) {
      return res.status(401).send('Invalid Authorization header format');
    }
    const token = authorizationHeader.split(' ')[1];
    // verifies both signature and the optional expiration date
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const decodedToken: string | JwtPayload = jwt.verify(token, RSA_PUBLIC_KEY);
    return next();
  } catch (error: unknown) {
    if (
      error instanceof TokenExpiredError ||
      error instanceof JsonWebTokenError ||
      error instanceof Error
    ) {
      return res.status(401).send(error.message);
    }
    return res.status(401).send('Authorization failed');
  }
}

export function checkIsAdmin(
  req: Request,
  res: Response,
  next: NextFunction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Response<any, Record<string, any>> | void {
  try {
    const authorizationHeader: string | undefined = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).send('The Authorization header was missing');
    }
    const authHeaderParts: string[] = authorizationHeader.split(' ');
    if (authHeaderParts.length < 2) {
      return res.status(401).send('Invalid Authorization header format');
    }
    const token = authorizationHeader.split(' ')[1];
    // verifies both signature and the optional expiration date
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const decodedToken: string | JwtPayload = jwt.verify(token, RSA_PUBLIC_KEY);
    if (typeof decodedToken === 'string') {
      return res.status(403).send('Not authorized');
    }
    const { roles } = decodedToken as JwtPayload;
    if (!roles || !Array.isArray(roles)) {
      return res.status(403).send('Not authorized');
    }

    if (roles.includes('admin')) {
      return next();
    }
    return res.status(403).send('Not authorized');
  } catch (error: unknown) {
    if (
      error instanceof TokenExpiredError ||
      error instanceof JsonWebTokenError ||
      error instanceof Error
    ) {
      return res.status(401).send(error.message);
    }
    return res.status(401).send('Authorization failed');
  }
}
