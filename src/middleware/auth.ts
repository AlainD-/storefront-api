import jwt, { JsonWebTokenError, JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { JWT_ALGORITHM, RSA_PUBLIC_KEY } from '../config/environment';
import Authentication401Error from '../errors/authentication-401.error';
import Header412Error from '../errors/header-412.error';
import NotAuthorized403Error from '../errors/not-authorized-403.error';

const checkHeader = (
  req: Request
): { error: string; token?: string } | { error?: string; token: string } => {
  const authorizationHeader: string | undefined = req.headers.authorization;
  if (!authorizationHeader) {
    return { error: 'The Authorization header was missing' };
  }
  const authHeaderParts: string[] = authorizationHeader.split(' ');
  if (authHeaderParts.length < 2) {
    return { error: 'Invalid Authorization header format' };
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
    const { error, token } = checkHeader(req);
    if (error) {
      return res.status(412).send(new Header412Error(error));
    }
    if (token) {
      // verifies both signature and the optional expiration date
      jwt.verify(token, RSA_PUBLIC_KEY, { algorithms: [JWT_ALGORITHM] });
      return next();
    }
    return res.status(401).send(new Authentication401Error('Not authenticated'));
  } catch (error: unknown) {
    if (
      error instanceof TokenExpiredError ||
      error instanceof JsonWebTokenError ||
      error instanceof Error
    ) {
      return res.status(401).send(new Authentication401Error(error.message));
    }
    return res.status(401).send(new Authentication401Error('Authentication failed'));
  }
}

export function checkIsAdmin(
  req: Request,
  res: Response,
  next: NextFunction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Response<any, Record<string, any>> | void {
  try {
    const { error, token } = checkHeader(req);
    if (error) {
      return res.status(412).send(new Header412Error(error));
    }
    if (token) {
      // verifies both signature and the optional expiration date
      const decodedToken: string | JwtPayload = jwt.verify(token, RSA_PUBLIC_KEY, {
        algorithms: [JWT_ALGORITHM],
      });
      if (typeof decodedToken === 'string') {
        return res.status(403).send(new NotAuthorized403Error('Not authorized'));
      }
      const { roles } = decodedToken as JwtPayload;
      if (!roles || !Array.isArray(roles)) {
        return res.status(403).send(new NotAuthorized403Error('Not authorized'));
      }

      if (roles.includes('admin')) {
        return next();
      }
    }
    return res.status(403).send(new NotAuthorized403Error('Not authorized'));
  } catch (error: unknown) {
    if (
      error instanceof TokenExpiredError ||
      error instanceof JsonWebTokenError ||
      error instanceof Error
    ) {
      return res.status(401).send(new Authentication401Error(error.message));
    }
    return res.status(403).send(new NotAuthorized403Error('Authorization failed'));
  }
}

export function checkIsCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Response<any, Record<string, any>> | void {
  try {
    const { error, token } = checkHeader(req);
    if (error) {
      return res.status(412).send(new Header412Error(error));
    }
    if (token) {
      // verifies both signature and the optional expiration date
      const decodedToken: string | JwtPayload = jwt.verify(token, RSA_PUBLIC_KEY, {
        algorithms: [JWT_ALGORITHM],
      });
      if (typeof decodedToken === 'string') {
        return res.status(403).send(new NotAuthorized403Error('Not authorized'));
      }
      const { userId } = decodedToken as JwtPayload;
      if (!userId) {
        return res.status(403).send(new NotAuthorized403Error('Not authorized'));
      }

      const { userId: qUserId } = req.params;

      if ((userId as number) === +qUserId) {
        return next();
      }
    }
    return res.status(403).send(new NotAuthorized403Error('Not authorized'));
  } catch (error: unknown) {
    if (
      error instanceof TokenExpiredError ||
      error instanceof JsonWebTokenError ||
      error instanceof Error
    ) {
      return res.status(401).send(new Authentication401Error(error.message));
    }
    return res.status(403).send(new NotAuthorized403Error('Authorization failed'));
  }
}
