import jwt, { JsonWebTokenError, JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { RSA_PUBLIC_KEY } from '../config/environment';

const checkHeader = (
  req: Request
):
  | { error: string; status: number; token?: string }
  | { error?: string; status?: number; token: string } => {
  const authorizationHeader: string | undefined = req.headers.authorization;
  if (!authorizationHeader) {
    return { error: 'The Authorization header was missing', status: 401 };
  }
  const authHeaderParts: string[] = authorizationHeader.split(' ');
  if (authHeaderParts.length < 2) {
    return { error: 'Invalid Authorization header format', status: 401 };
  }
  const token: string = authHeaderParts[1];
  return { token };
};

export function checkAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Response<any, Record<string, any>> | void {
  try {
    const { error, status, token } = checkHeader(req);
    if (error && status) {
      return res.status(status).send(error);
    }
    if (token) {
      // verifies both signature and the optional expiration date
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      jwt.verify(token, RSA_PUBLIC_KEY);
      return next();
    }
    return res.status(401).send('Not authenticated');
  } catch (error: unknown) {
    if (
      error instanceof TokenExpiredError ||
      error instanceof JsonWebTokenError ||
      error instanceof Error
    ) {
      return res.status(401).send(error.message);
    }
    return res.status(401).send('Authentication failed');
  }
}

export function checkIsAdmin(
  req: Request,
  res: Response,
  next: NextFunction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Response<any, Record<string, any>> | void {
  try {
    const { error, status, token } = checkHeader(req);
    if (error && status) {
      return res.status(status).send(error);
    }
    if (token) {
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
    return res.status(403).send('Authorization failed');
  }
}

export function checkIsCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Response<any, Record<string, any>> | void {
  try {
    const { error, status, token } = checkHeader(req);
    if (error && status) {
      return res.status(status).send(error);
    }
    if (token) {
      // verifies both signature and the optional expiration date
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const decodedToken: string | JwtPayload = jwt.verify(token, RSA_PUBLIC_KEY);
      if (typeof decodedToken === 'string') {
        return res.status(403).send('Not authorized ');
      }
      const { userId } = decodedToken as JwtPayload;
      if (!userId) {
        return res.status(403).send('Not authorized');
      }

      const { userId: qUserId } = req.params;

      if ((userId as number) === +qUserId) {
        return next();
      }
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
    return res.status(403).send('Authorization failed');
  }
}
