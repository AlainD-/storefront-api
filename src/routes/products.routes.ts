import express, { Router, Request, Response } from 'express';
import BadRequest400Error from '../errors/bad-request-400.error';
import Internal500Error from '../errors/internal-500.error';
import NotFound404Error from '../errors/not-found-404.error';
import { checkIsAdmin } from '../middleware/auth';
import { Product } from '../models/product';
import { ProductInput } from '../models/product-input';
import { ProductStore, validate } from '../models/product.store';
import { isANumber, queryToNumber } from '../services/common-validation.service';

const router: Router = express.Router();
const productStore = new ProductStore();
const INVALID_PRODUCT_ID = 'The product id is not a valid number';
const PRODUCT_NOT_FOUND = 'The product with the given id was not found';

router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId }: { categoryId?: number } = req.query;
    const products: Product[] = await productStore.index({ categoryId });
    return res.send(products);
  } catch (_error) {
    return res.status(500).send(new Internal500Error('Could not get the products'));
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(new BadRequest400Error(INVALID_PRODUCT_ID));
  }

  const id: number = queryToNumber(qId);
  const product: Product | undefined = await productStore.show(id);

  if (!product) {
    return res.status(404).send(new NotFound404Error(PRODUCT_NOT_FOUND));
  }

  return res.send(product);
});

router.post('/', checkIsAdmin, async (req: Request, res: Response) => {
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(new BadRequest400Error(error.details[0]?.message));
  }

  try {
    const { name, price, categoryId, imageUrl } = req.body as ProductInput;
    const product: Product | undefined = await productStore.create({
      name,
      price,
      categoryId,
      imageUrl,
    });

    if (!product) {
      return res
        .status(500)
        .send(
          new Internal500Error('An unexpected error occurred during the creation of the product')
        );
    }

    return res.status(201).send(product);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return res
      .status(500)
      .send(
        new Internal500Error(
          `An unexpected error occurred during the creation of the product. ${err?.message ?? ''}`
        )
      );
  }
});

router.put('/:id', checkIsAdmin, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(new BadRequest400Error(INVALID_PRODUCT_ID));
  }

  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(new BadRequest400Error(error.details[0]?.message));
  }

  const id: number = queryToNumber(qId);
  const { name, price, categoryId, imageUrl } = req.body as Product;
  const product: Product | undefined = await productStore.show(id);

  if (!product) {
    return res.status(404).send(new NotFound404Error(PRODUCT_NOT_FOUND));
  }

  try {
    const updatedProduct: Product | undefined = await productStore.update(id, {
      name,
      price,
      categoryId,
      imageUrl,
    });

    return res.send(updatedProduct);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return res
      .status(500)
      .send(
        new Internal500Error(
          `An unexpected error occurred during the update of the product. ${err?.message ?? ''}`
        )
      );
  }
});

router.delete('/:id', checkIsAdmin, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(new BadRequest400Error(INVALID_PRODUCT_ID));
  }

  const id: number = queryToNumber(qId);
  const product: Product | undefined = await productStore.show(id);

  if (!product) {
    return res.status(404).send(new NotFound404Error(PRODUCT_NOT_FOUND));
  }

  try {
    const deletedProduct: Product | undefined = await productStore.delete(id);

    return res.send(deletedProduct);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return res
      .status(500)
      .send(
        new Internal500Error(
          `An unexpected error occurred during the deletion of the product. ${err?.message ?? ''}`
        )
      );
  }
});

export default router;
