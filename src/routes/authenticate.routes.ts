import express, { Router, Request, Response } from 'express';
import { Credentials } from '../models/credentials';
import { User } from '../models/user';
import { AuthenticationStore, validate } from '../models/authentication.store';
import { getJWTToken } from '../services/security.service';
import Authentication401Error from '../errors/authentication-401.error';
import BadRequest400Error from '../errors/bad-request-400.error';
import Internal500Error from '../errors/internal-500.error';

const router: Router = express.Router();

/**
 * This route is used for login
 */
router.post('/', async (req: Request, res: Response) => {
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(new BadRequest400Error(error.details[0]?.message));
  }

  try {
    const { email, password } = req.body as Credentials;
    const user: User | null = await AuthenticationStore.authenticate({ email, password });

    if (!user) {
      return res.status(401).send(new Authentication401Error('Authentication failed'));
    }

    const token: string = getJWTToken(user);
    return res.send({ token, user });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return res
      .status(500)
      .send(
        new Internal500Error(
          `An unexpected error occurred during the authentication. ${err?.message ?? ''}`
        )
      );
  }
});

export default router;
