import express, { Router, Request, Response } from 'express';
import checkAuthenticated from '../middleware/auth';
import { Product } from '../models/product';
import { ProductInput } from '../models/product-input';
import { ProductStore, validate } from '../models/product.store';
import { isANumber, queryToNumber } from '../services/common-validation.service';

const router: Router = express.Router();
const INVALID_PRODUCT_ID = 'The product id is not a valid number';
const PRODUCT_NOT_FOUND = 'The product with the given id was not found';

router.get('/', async (_req: Request, res: Response) => {
  let products: Product[];
  try {
    products = await ProductStore.index();
  } catch (_error) {
    return res.status(500).send('Could not get the products');
  }

  return res.send(products);
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_PRODUCT_ID);
  }

  const id: number = queryToNumber(qId);
  const product: Product | undefined = await ProductStore.show(id);

  if (!product) {
    return res.status(404).send(PRODUCT_NOT_FOUND);
  }

  return res.send(product);
});

router.post('/', checkAuthenticated, async (req: Request, res: Response) => {
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  try {
    const { name, price, category } = req.body as ProductInput;
    const product: Product | undefined = await ProductStore.create({ name, price, category });

    if (!product) {
      return res
        .status(500)
        .send('An unexpected error occurred during the creation of the product');
    }

    return res.send(product);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return res
      .status(500)
      .send(
        `An unexpected error occurred during the creation of the product. ${err?.message ?? ''}`
      );
  }
});

router.put('/:id', checkAuthenticated, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_PRODUCT_ID);
  }

  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0]?.message);
  }

  const id: number = queryToNumber(qId);
  const { name, price, category } = req.body;
  const product: Product | undefined = await ProductStore.show(id);

  if (!product) {
    return res.status(404).send(PRODUCT_NOT_FOUND);
  }

  const updatedProduct: Product | undefined = await ProductStore.update(id, {
    name,
    price,
    category,
  });

  return res.send(updatedProduct);
});

router.delete('/:id', checkAuthenticated, async (req: Request, res: Response) => {
  const { id: qId } = req.params;
  if (!isANumber(qId)) {
    return res.status(400).send(INVALID_PRODUCT_ID);
  }

  const id: number = queryToNumber(qId);
  const product: Product | undefined = await ProductStore.show(id);

  if (!product) {
    return res.status(404).send(PRODUCT_NOT_FOUND);
  }

  const deletedProduct: Product | undefined = await ProductStore.delete(id);

  return res.send(deletedProduct);
});

export default router;
