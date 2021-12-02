import supertest, { Response, SuperTest, Test } from 'supertest';
import app from '../../app';
import DatabaseService from '../../services/database.service';
import { User } from '../../models/user';
import { getJWTToken } from '../../services/security.service';
import { Product } from '../../models/product';
import { Category } from '../../models/category';

const request: SuperTest<Test> = supertest(app);
const productsEndPoint = '/api/v1/products';

const deleteAllProducts = async (): Promise<void> => {
  const query = 'DELETE FROM products;';
  await DatabaseService.runQuery<Product>(query);
};

const deleteAllCategories = async (): Promise<void> => {
  const query = 'DELETE FROM categories;';
  await DatabaseService.runQuery<Category>(query);
};

const insertCategory = async (name = 'c'): Promise<Category> => {
  const query = 'INSERT INTO categories (name) VALUES ($1) RETURNING id, name;';
  const categories: Category[] = await DatabaseService.runQuery<Category>(query, [name]);
  return categories[0];
};

const insertProduct = async (categoryId: number): Promise<Product> => {
  const query = `INSERT INTO products (name, price, category_id, image_url)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, price, category_id AS "categoryId", image_url AS "imageUrl";`;
  const values: (string | number)[] = ['a', 1, categoryId, 'b'];
  const products: Product[] = await DatabaseService.runQuery<Product>(query, values);
  return products[0];
};

const maxProductId = async (): Promise<number> => {
  const query = `SELECT NEXTVAL(pg_get_serial_sequence('products', 'id')) AS "maxId";`;
  const ids: { maxId: string }[] = await DatabaseService.runQuery<{ maxId: string }>(query);
  return parseInt(ids[0]?.maxId, 10);
};

describe('GET /api/v1/products', () => {
  let category: Category;

  beforeAll(async () => {
    await deleteAllProducts();
    await deleteAllCategories();
    category = await insertCategory();
  });

  beforeEach(async () => {
    await deleteAllProducts();
  });

  it('should not require authentication token', async () => {
    const response: Response = await request.get(productsEndPoint);
    const { status, type } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
  });

  it('should return an empty list when the table is empty', async () => {
    const response: Response = await request.get(productsEndPoint);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual([]);
  });

  it('should respond a list of Product when the table has values', async () => {
    await insertProduct(category.id);
    const response: Response = await request.get(productsEndPoint);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body.length > 0).toBeTruthy();
    expect(body).toContain({
      id: jasmine.any(Number),
      name: 'a',
      price: 1,
      categoryId: category.id,
      imageUrl: 'b',
    });
  });

  it('should filter products on categoryId', async () => {
    const otherCategoryName = `${category.name}0`;
    const otherCategory: Category = await insertCategory(otherCategoryName);
    await insertProduct(category.id);
    await insertProduct(otherCategory.id);
    let response: Response = await request.get(productsEndPoint);
    expect(response.status).toBe(200);
    expect(response.type).toContain('json');
    expect(response.body.length > 0).toBeTruthy();
    let categoryIds: number[] = response.body.map((p: Product) => p.categoryId);
    expect(categoryIds).toContain(category.id);
    expect(categoryIds).toContain(otherCategory.id);

    response = await request.get(`${productsEndPoint}?categoryId=${otherCategory.id}`);
    expect(response.status).toBe(200);
    expect(response.type).toContain('json');
    expect(response.body.length > 0).toBeTruthy();
    categoryIds = response.body.map((p: Product) => p.categoryId);
    expect(categoryIds).not.toContain(category.id);
    expect(categoryIds).toContain(otherCategory.id);
  });
});

describe('GET /api/v1/products/:id', () => {
  let maxId: number;
  let category: Category;

  beforeAll(async () => {
    await deleteAllProducts();
    await deleteAllCategories();
    category = await insertCategory();
  });

  beforeEach(async () => {
    await deleteAllProducts();
    maxId = await maxProductId();
  });

  it('should not require authentication token', async () => {
    const response: Response = await request.get(`${productsEndPoint}/0`);
    const { status } = response;
    expect(status).not.toBe(412);
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });

  it('should return 404 error when the product does not exist', async () => {
    const response: Response = await request.get(`${productsEndPoint}/0`);
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should respond the Product details when it exists', async () => {
    const productId = maxId + 1;
    await insertProduct(category.id);
    const response: Response = await request.get(`${productsEndPoint}/${productId}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({
      id: productId,
      name: 'a',
      price: 1,
      categoryId: category.id,
      imageUrl: 'b',
    });
  });
});

describe('POST /api/v1/products', () => {
  let product: { name: unknown; price: unknown; categoryId: unknown; imageUrl: unknown };
  const nonAdminUser: User = { id: 0, email: '', firstName: '', lastName: '', isAdmin: false };
  const admin: User = { ...nonAdminUser, isAdmin: true };
  let nonAdminToken: string;
  let token: string;
  let category: Category;

  beforeAll(async () => {
    await deleteAllProducts();
    await deleteAllCategories();
    category = await insertCategory();
    nonAdminToken = getJWTToken(nonAdminUser);
    token = getJWTToken(admin);
  });

  describe('For non admin users', () => {
    beforeEach(async () => {
      await deleteAllProducts();
      product = { name: 'a', price: 1, categoryId: category.id, imageUrl: 'b' };
    });

    it('should respond a 412 error for non authenticated requests without token', async () => {
      const response: Response = await request.post(productsEndPoint).send(product);
      const { status, type, body } = response;
      expect(status).toBe(412);
      expect(type).toContain('json');
      expect(body.message).toMatch(/header.+missing/i);
    });

    it('should respond a 403 error for non admins', async () => {
      const response: Response = await request
        .post(productsEndPoint)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send(product);
      const { status, type, body } = response;
      expect(status).toBe(403);
      expect(type).toContain('json');
      expect(body.message).toMatch(/not authorized/i);
    });

    it('should respond a 201 for admins', async () => {
      const response: Response = await request
        .post(productsEndPoint)
        .set('Authorization', `Bearer ${token}`)
        .send(product);
      const { status, type } = response;
      expect(status).toBe(201);
      expect(type).toContain('json');
    });
  });

  describe('For admin users', () => {
    describe('Data validation', () => {
      beforeEach(async () => {
        await deleteAllProducts();
        product = { name: 'a', price: 1, categoryId: category.id, imageUrl: 'b' };
      });

      it('should respond 400 error if the name property is missing', async () => {
        product.name = undefined;
        let response: Response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+required/);

        product.name = null;
        response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+must be a string/);

        product.name = '';
        response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+not allowed to be empty/);
      });

      it('should respond 400 error if the price property is missing', async () => {
        product.price = undefined;
        let response: Response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/price.+required/);

        product.price = null;
        response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/price.+must be a number/);
      });

      it('should respond 400 error if the price is not a strict positive number', async () => {
        product.price = 0;
        let response: Response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/price.+must be a positive number/);

        product.price = -1;
        response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/price.+must be a positive number/);
      });

      it('should respond 400 error if the categoryId property is missing', async () => {
        product.categoryId = undefined;
        let response: Response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/categoryId.+required/);

        product.categoryId = null;
        response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/categoryId.+must be a number/);
      });

      it('should allow imageUrl to be missing', async () => {
        product.imageUrl = undefined;
        let response: Response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(201);
        expect(response.type).toContain('json');

        product.imageUrl = null;
        response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(201);
        expect(response.type).toContain('json');
      });

      it('should return a 400 error if the imageUrl is an empty string', async () => {
        product.imageUrl = '';
        const response: Response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/imageUrl.+not allowed to be empty/i);
      });
    });

    describe('Happy path for admins', () => {
      beforeEach(async () => {
        await deleteAllProducts();
        product = { name: 'a', price: 1, categoryId: category.id, imageUrl: 'b' };
      });

      it('should add the product', async () => {
        const response: Response = await request
          .post(productsEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        const { status, type, body } = response;
        expect(status).toBe(201);
        expect(type).toContain('json');
        expect(body).toEqual({
          id: jasmine.any(Number),
          name: 'a',
          price: 1,
          categoryId: category.id,
          imageUrl: 'b',
        });
      });
    });
  });
});

describe('PUT /api/v1/products/:id', () => {
  let product: { name: unknown; price: unknown; categoryId: unknown; imageUrl: unknown };
  const nonAdminUser: User = { id: 0, email: '', firstName: '', lastName: '', isAdmin: false };
  const admin: User = { ...nonAdminUser, isAdmin: true };
  let nonAdminToken: string;
  let token: string;
  let category: Category;

  beforeAll(async () => {
    await deleteAllProducts();
    await deleteAllCategories();
    category = await insertCategory();
    nonAdminToken = getJWTToken(nonAdminUser);
    token = getJWTToken(admin);
  });

  describe('For non admin users', () => {
    beforeEach(async () => {
      await deleteAllProducts();
      product = { name: 'a', price: 1, categoryId: category.id, imageUrl: 'b' };
    });

    it('should respond a 412 error for non authenticated requests without token', async () => {
      const response: Response = await request.put(`${productsEndPoint}/0`).send(product);
      const { status, type, body } = response;
      expect(status).toBe(412);
      expect(type).toContain('json');
      expect(body.message).toMatch(/header.+missing/i);
    });

    it('should respond a 403 error for non admins', async () => {
      const response: Response = await request
        .put(`${productsEndPoint}/0`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send(product);
      const { status, type, body } = response;
      expect(status).toBe(403);
      expect(type).toContain('json');
      expect(body.message).toMatch(/not authorized/i);
    });

    it('should respond a 200 for admins', async () => {
      const lastProduct: Product = await insertProduct(category.id);
      const response: Response = await request
        .put(`${productsEndPoint}/${lastProduct.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(product);
      const { status, type } = response;
      expect(status).toBe(200);
      expect(type).toContain('json');
    });
  });

  describe('For admin users', () => {
    let lastProduct: Product;
    let id: number;

    describe('Data validation', () => {
      beforeEach(async () => {
        await deleteAllProducts();
        product = { name: 'a', price: 1, categoryId: category.id, imageUrl: 'b' };
        lastProduct = await insertProduct(category.id);
        id = lastProduct.id;
      });

      it('should respond a 404 error when the id does not exist', async () => {
        const inexistentId = lastProduct.id + 1;
        const response: Response = await request
          .put(`${productsEndPoint}/${inexistentId}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        const { status, type, body } = response;
        expect(status).toBe(404);
        expect(type).toContain('json');
        expect(body.message).toMatch(/not found/i);
      });

      it('should respond a 400 error when name is missing', async () => {
        product.name = undefined;
        let response: Response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+required/i);

        product.name = null;
        response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+must be a string/i);

        product.name = '';
        response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+not allowed to be empty/i);
      });

      it('should respond a 400 error when price is missing', async () => {
        product.price = undefined;
        let response: Response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/price.+required/i);

        product.price = null;
        response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/price.+must be a number/i);
      });

      it('should respond a 400 error when categoryId is missing', async () => {
        product.categoryId = undefined;
        let response: Response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/categoryId.+required/i);

        product.categoryId = null;
        response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/categoryId.+must be a number/i);
      });

      it('should respond a 400 error when price is not a strict positive number', async () => {
        product.price = 0;
        let response: Response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/price.+must be a positive number/i);

        product.price = -1;
        response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/price.+must be a positive number/i);
      });
    });

    describe('Happy path', () => {
      beforeEach(async () => {
        await deleteAllProducts();
        product = { name: 'a', price: 1, categoryId: category.id, imageUrl: 'b' };
        lastProduct = await insertProduct(category.id);
        id = lastProduct.id;
      });

      it('should update the name, price and categoryId and imageUrl for the given product id', async () => {
        const newCategory: Category = await insertCategory(`${category.name}0`);
        product.name = 'a0';
        product.price = 10;
        product.imageUrl = 'b0';
        product.categoryId = newCategory.id;

        const response: Response = await request
          .put(`${productsEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(product);
        const { status, type, body } = response;
        expect(status).toBe(200);
        expect(type).toContain('json');
        expect(body).toEqual({
          id,
          name: 'a0',
          price: 10,
          categoryId: newCategory.id,
          imageUrl: 'b0',
        });
      });
    });
  });
});

describe('DELETE /api/v1/products/:id', () => {
  let product: { name: unknown; price: unknown; categoryId: unknown; imageUrl: unknown };
  const nonAdminUser: User = { id: 0, email: '', firstName: '', lastName: '', isAdmin: false };
  const admin: User = { ...nonAdminUser, isAdmin: true };
  let nonAdminToken: string;
  let token: string;
  let lastProduct: Product;
  let id: number;
  let category: Category;

  beforeAll(async () => {
    await deleteAllProducts();
    await deleteAllCategories();
    category = await insertCategory();
    nonAdminToken = getJWTToken(nonAdminUser);
    token = getJWTToken(admin);
  });

  beforeEach(async () => {
    await deleteAllProducts();
    product = { name: 'a', price: 1, categoryId: category.id, imageUrl: 'b' };
    lastProduct = await insertProduct(category.id);
    id = lastProduct.id;
  });

  it('should respond a 403 error for non admins', async () => {
    const response: Response = await request
      .delete(`${productsEndPoint}/${id}`)
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send(product);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should respond a 200 for admins', async () => {
    const response: Response = await request
      .put(`${productsEndPoint}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(product);
    const { status, type } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
  });

  it('should respond a 404 error when the id does not exist', async () => {
    const inexistentId = lastProduct.id + 1;
    const response: Response = await request
      .put(`${productsEndPoint}/${inexistentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(product);
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should delete the product', async () => {
    const responseBeforeDelete: Response = await request
      .get(`${productsEndPoint}`)
      .set('Authorization', `Bearer ${token}`);
    const numberOfItemsBefore: number = responseBeforeDelete.body.length;

    let response: Response = await request
      .delete(`${productsEndPoint}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.type).toContain('json');
    expect(response.body).toEqual({
      id,
      name: 'a',
      price: 1,
      categoryId: category.id,
      imageUrl: 'b',
    });

    const responseAfterDelete: Response = await request
      .get(`${productsEndPoint}`)
      .set('Authorization', `Bearer ${token}`);
    const numberOfItemsAfter: number = responseAfterDelete.body.length;
    expect(numberOfItemsBefore - 1).toBe(numberOfItemsAfter);

    response = await request
      .delete(`${productsEndPoint}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.type).toContain('json');
    expect(response.body.message).toMatch(/not found/i);
  });
});
