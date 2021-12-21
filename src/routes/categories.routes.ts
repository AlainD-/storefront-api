import express, { Router, Request, Response } from 'express';
import BadRequest400Error from '../errors/bad-request-400.error';
import Internal500Error from '../errors/internal-500.error';
import NotFound404Error from '../errors/not-found-404.error';
import { checkIsAdmin } from '../middleware/auth';
import { Category } from '../models/category';
import { CategoryStore, validate } from '../models/category.store';
import { isANumber, queryToNumber } from '../services/common-validation.service';

const router: Router = express.Router();
const categoryStore = new CategoryStore();
const INVALID_CATEGORY_ID = 'The category id is not a valid number';
const CATEGORY_NOT_FOUND = 'The category with the given id was not found';

router.get('/', async (_req: Request, res: Response) => {
  let categories: Category[];
  try {
    categories = await categoryStore.index();
  } catch (_error) {
    return res.status(500).send(new Internal500Error('Could not get the categories'));
  }

  return res.send(categories);
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(new BadRequest400Error(INVALID_CATEGORY_ID));
  }

  const id: number = queryToNumber(qId);
  const category: Category | undefined = await categoryStore.show(id);

  if (!category) {
    return res.status(404).send(new NotFound404Error(CATEGORY_NOT_FOUND));
  }

  return res.send(category);
});

router.post('/', checkIsAdmin, async (req: Request, res: Response) => {
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(new BadRequest400Error(error.details[0]?.message));
  }

  try {
    const { name } = req.body as Category;
    const category: Category | undefined = await categoryStore.create({ name });

    if (!category) {
      return res
        .status(500)
        .send(
          new Internal500Error('An unexpected error occurred during the creation of the category')
        );
    }

    return res.status(201).send(category);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return res
      .status(500)
      .send(
        new Internal500Error(
          `An unexpected error occurred during the creation of the category. ${err?.message ?? ''}`
        )
      );
  }
});

router.put('/:id', checkIsAdmin, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(new BadRequest400Error(INVALID_CATEGORY_ID));
  }

  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(new BadRequest400Error(error.details[0]?.message));
  }

  const id: number = queryToNumber(qId);
  const { name } = req.body as Category;
  const category: Category | undefined = await categoryStore.show(id);

  if (!category) {
    return res.status(404).send(new NotFound404Error(CATEGORY_NOT_FOUND));
  }

  try {
    const updatedCategory: Category | undefined = await categoryStore.update(id, { name });

    return res.send(updatedCategory);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return res
      .status(500)
      .send(
        new Internal500Error(
          `An unexpected error occurred during the update of the category. ${err?.message ?? ''}`
        )
      );
  }
});

router.delete('/:id', checkIsAdmin, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(new BadRequest400Error(INVALID_CATEGORY_ID));
  }

  const id: number = queryToNumber(qId);
  const category: Category | undefined = await categoryStore.show(id);

  if (!category) {
    return res.status(404).send(new NotFound404Error(CATEGORY_NOT_FOUND));
  }

  try {
    const deletedCategory: Category | undefined = await categoryStore.delete(id);

    return res.send(deletedCategory);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return res
      .status(500)
      .send(
        new Internal500Error(
          `An unexpected error occurred during the deletion of the category. ${err?.message ?? ''}`
        )
      );
  }
});

export default router;
