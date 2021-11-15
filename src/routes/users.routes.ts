import express, { Router, Request, Response } from 'express';
import { User } from '../models/user';
import { UserStore, validateUser } from '../models/user.store';
import { isANumber, queryToNumber } from '../services/common-validation.service';

const router: Router = express.Router();
const INVALID_USER_ID = 'The user id is not a valid number';
const USER_NOT_FOUND = 'The user with the given id was not found';

router.get('/', async (_req: Request, res: Response) => {
  let users: User[];
  try {
    users = await UserStore.index();
  } catch (_error) {
    return res.status(500).send('Could not get the users');
  }

  return res.send(users);
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_USER_ID);
  }

  const id: number = queryToNumber(qId);
  const user: User | undefined = await UserStore.show(id);

  if (!user) {
    return res.status(404).send(USER_NOT_FOUND);
  }

  return res.send(user);
});

router.post('/', async (req: Request, res: Response) => {
  const { error } = validateUser(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  const { firstName, lastName } = req.body;
  const user: User | undefined = await UserStore.create({ firstName, lastName });

  if (!user) {
    return res.status(500).send('An unexpected error occurred during the creation of the user');
  }

  return res.send(user);
});

router.put('/:id', async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_USER_ID);
  }

  const { error } = validateUser(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  const id: number = queryToNumber(qId);
  const { firstName, lastName } = req.body;
  const user: User | undefined = await UserStore.show(id);

  if (!user) {
    return res.status(404).send(USER_NOT_FOUND);
  }

  const updatedUser: User | undefined = await UserStore.update(id, { firstName, lastName });

  return res.send(updatedUser);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_USER_ID);
  }

  const id: number = queryToNumber(qId);
  const user: User | undefined = await UserStore.show(id);

  if (!user) {
    return res.status(404).send(USER_NOT_FOUND);
  }

  const deletedUser: User | undefined = await UserStore.delete(id);

  return res.send(deletedUser);
});

export default router;
