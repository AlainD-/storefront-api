import supertest, { Response, SuperTest, Test } from 'supertest';
import app from '../../app';
import DatabaseService from '../../services/database.service';
import { User } from '../../models/user';
import { getJWTToken } from '../../services/security.service';
import { Category } from '../../models/category';

const request: SuperTest<Test> = supertest(app);
const categoriesEndPoint = '/api/v1/categories';

const deleteAllCategories = async (): Promise<void> => {
  const query = 'DELETE FROM categories;';
  await DatabaseService.runQuery<Category>(query);
};

const insertCategory = async (name = 'a'): Promise<Category> => {
  const query = 'INSERT INTO categories (name) VALUES ($1) RETURNING id, name;';
  const categories: Category[] = await DatabaseService.runQuery<Category>(query, [name]);
  return categories[0];
};

const maxCategoryId = async (): Promise<number> => {
  const query = `SELECT NEXTVAL(pg_get_serial_sequence('categories', 'id')) AS "maxId";`;
  const ids: { maxId: string }[] = await DatabaseService.runQuery<{ maxId: string }>(query);
  return parseInt(ids[0]?.maxId, 10);
};

describe('GET /api/v1/categories', () => {
  beforeEach(async () => {
    await deleteAllCategories();
  });

  it('should not require authentication token', async () => {
    const response: Response = await request.get(categoriesEndPoint);
    const { status, type } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
  });

  it('should return an empty list when the table is empty', async () => {
    const response: Response = await request.get(categoriesEndPoint);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual([]);
  });

  it('should respond a list of Category when the table has values', async () => {
    await insertCategory();
    const response: Response = await request.get(categoriesEndPoint);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body.length > 0).toBeTruthy();
    expect(body).toContain({ id: jasmine.any(Number), name: 'a' });
  });
});

describe('GET /api/v1/categories/:id', () => {
  let maxId: number;

  beforeEach(async () => {
    await deleteAllCategories();
    maxId = await maxCategoryId();
  });

  it('should not require authentication token', async () => {
    const response: Response = await request.get(`${categoriesEndPoint}/0`);
    const { status } = response;
    expect(status).not.toBe(412);
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });

  it('should return 404 error when the category does not exist', async () => {
    const response: Response = await request.get(`${categoriesEndPoint}/0`);
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should respond the Category details when it exists', async () => {
    const categoryId = maxId + 1;
    await insertCategory();
    const response: Response = await request.get(`${categoriesEndPoint}/${categoryId}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({ id: categoryId, name: 'a' });
  });
});

describe('POST /api/v1/categories', () => {
  let category: { name: unknown };
  const nonAdminUser: User = { id: 0, email: '', firstName: '', lastName: '', isAdmin: false };
  const admin: User = { ...nonAdminUser, isAdmin: true };
  let nonAdminToken: string;
  let token: string;

  beforeAll(async () => {
    nonAdminToken = getJWTToken(nonAdminUser);
    token = getJWTToken(admin);
  });

  describe('For non admin users', () => {
    beforeEach(async () => {
      await deleteAllCategories();
      category = { name: 'a' };
    });

    it('should respond a 412 error for non authenticated requests without token', async () => {
      const response: Response = await request.post(categoriesEndPoint).send(category);
      const { status, type, body } = response;
      expect(status).toBe(412);
      expect(type).toContain('json');
      expect(body.message).toMatch(/header.+missing/i);
    });

    it('should respond a 403 error for non admins', async () => {
      const response: Response = await request
        .post(categoriesEndPoint)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send(category);
      const { status, type, body } = response;
      expect(status).toBe(403);
      expect(type).toContain('json');
      expect(body.message).toMatch(/not authorized/i);
    });

    it('should respond a 201 for admins', async () => {
      const response: Response = await request
        .post(categoriesEndPoint)
        .set('Authorization', `Bearer ${token}`)
        .send(category);
      const { status, type } = response;
      expect(status).toBe(201);
      expect(type).toContain('json');
    });
  });

  describe('For admin users', () => {
    describe('Data validation', () => {
      beforeEach(async () => {
        await deleteAllCategories();
        category = { name: 'a' };
      });

      it('should respond 400 error if the name property is missing', async () => {
        category.name = undefined;
        let response: Response = await request
          .post(categoriesEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(category);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+required/);

        category.name = null;
        response = await request
          .post(categoriesEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(category);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+must be a string/);

        category.name = '';
        response = await request
          .post(categoriesEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(category);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+not allowed to be empty/);
      });
    });

    describe('Happy path for admins', () => {
      beforeEach(async () => {
        await deleteAllCategories();
        category = { name: 'a' };
      });

      it('should add the category', async () => {
        const response: Response = await request
          .post(categoriesEndPoint)
          .set('Authorization', `Bearer ${token}`)
          .send(category);
        const { status, type, body } = response;
        expect(status).toBe(201);
        expect(type).toContain('json');
        expect(body).toEqual({ id: jasmine.any(Number), name: 'a' });
      });
    });
  });
});

describe('PUT /api/v1/categories/:id', () => {
  let category: { name: unknown };
  const nonAdminUser: User = { id: 0, email: '', firstName: '', lastName: '', isAdmin: false };
  const admin: User = { ...nonAdminUser, isAdmin: true };
  let nonAdminToken: string;
  let token: string;

  beforeAll(async () => {
    nonAdminToken = getJWTToken(nonAdminUser);
    token = getJWTToken(admin);
  });

  describe('For non admin users', () => {
    beforeEach(async () => {
      await deleteAllCategories();
      category = { name: 'a' };
    });

    it('should respond a 412 error for non authenticated requests without token', async () => {
      const response: Response = await request.put(`${categoriesEndPoint}/0`).send(category);
      const { status, type, body } = response;
      expect(status).toBe(412);
      expect(type).toContain('json');
      expect(body.message).toMatch(/header.+missing/i);
    });

    it('should respond a 403 error for non admins', async () => {
      const response: Response = await request
        .put(`${categoriesEndPoint}/0`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send(category);
      const { status, type, body } = response;
      expect(status).toBe(403);
      expect(type).toContain('json');
      expect(body.message).toMatch(/not authorized/i);
    });

    it('should respond a 200 for admins', async () => {
      const lastCategory: Category = await insertCategory();
      const response: Response = await request
        .put(`${categoriesEndPoint}/${lastCategory.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(category);
      const { status, type } = response;
      expect(status).toBe(200);
      expect(type).toContain('json');
    });
  });

  describe('For admin users', () => {
    let lastCategory: Category;
    let id: number;

    describe('Data validation', () => {
      beforeEach(async () => {
        await deleteAllCategories();
        category = { name: 'a' };
        lastCategory = await insertCategory();
        id = lastCategory.id;
      });

      it('should respond a 404 error when the id does not exist', async () => {
        const inexistentId = lastCategory.id + 1;
        const response: Response = await request
          .put(`${categoriesEndPoint}/${inexistentId}`)
          .set('Authorization', `Bearer ${token}`)
          .send(category);
        const { status, type, body } = response;
        expect(status).toBe(404);
        expect(type).toContain('json');
        expect(body.message).toMatch(/not found/i);
      });

      it('should respond a 400 error when name is missing', async () => {
        category.name = undefined;
        let response: Response = await request
          .put(`${categoriesEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(category);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+required/i);

        category.name = null;
        response = await request
          .put(`${categoriesEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(category);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+must be a string/i);

        category.name = '';
        response = await request
          .put(`${categoriesEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(category);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/name.+not allowed to be empty/i);
      });
    });

    describe('Happy path', () => {
      beforeEach(async () => {
        await deleteAllCategories();
        category = { name: 'a' };
        lastCategory = await insertCategory();
        id = lastCategory.id;
      });

      it('should update the name for the given category id', async () => {
        category.name = 'a0';
        const response: Response = await request
          .put(`${categoriesEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(category);
        const { status, type, body } = response;
        expect(status).toBe(200);
        expect(type).toContain('json');
        expect(body).toEqual({ id, name: 'a0' });
      });
    });
  });
});

describe('DELETE /api/v1/categories/:id', () => {
  let category: { name: unknown };
  const nonAdminUser: User = { id: 0, email: '', firstName: '', lastName: '', isAdmin: false };
  const admin: User = { ...nonAdminUser, isAdmin: true };
  let nonAdminToken: string;
  let token: string;
  let lastCategory: Category;
  let id: number;

  beforeAll(async () => {
    nonAdminToken = getJWTToken(nonAdminUser);
    token = getJWTToken(admin);
  });

  beforeEach(async () => {
    await deleteAllCategories();
    category = { name: 'a' };
    lastCategory = await insertCategory();
    id = lastCategory.id;
  });

  it('should respond a 403 error for non admins', async () => {
    const response: Response = await request
      .delete(`${categoriesEndPoint}/${id}`)
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send(category);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should respond a 200 for admins', async () => {
    const response: Response = await request
      .put(`${categoriesEndPoint}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(category);
    const { status, type } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
  });

  it('should respond a 404 error when the id does not exist', async () => {
    const inexistentId = lastCategory.id + 1;
    const response: Response = await request
      .put(`${categoriesEndPoint}/${inexistentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(category);
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should delete the category', async () => {
    const responseBeforeDelete: Response = await request
      .get(`${categoriesEndPoint}`)
      .set('Authorization', `Bearer ${token}`);
    const numberOfItemsBefore: number = responseBeforeDelete.body.length;

    let response: Response = await request
      .delete(`${categoriesEndPoint}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.type).toContain('json');
    expect(response.body).toEqual({ id, name: 'a' });

    const responseAfterDelete: Response = await request
      .get(`${categoriesEndPoint}`)
      .set('Authorization', `Bearer ${token}`);
    const numberOfItemsAfter: number = responseAfterDelete.body.length;
    expect(numberOfItemsBefore - 1).toBe(numberOfItemsAfter);

    response = await request
      .delete(`${categoriesEndPoint}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.type).toContain('json');
    expect(response.body.message).toMatch(/not found/i);
  });
});
