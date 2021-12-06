import supertest, { Response, SuperTest, Test } from 'supertest';
import app from '../../app';
import { Category } from '../../models/category';
import { Order } from '../../models/order';
import { OrderItem } from '../../models/order-item';
import { Product } from '../../models/product';
import { User } from '../../models/user';
import { getJWTToken } from '../../services/security.service';
import {
  deleteAllCategories,
  deleteAllOrderItems,
  deleteAllOrders,
  deleteAllProducts,
  deleteAllUsers,
  insertCategory,
  insertOrder,
  insertOrderItem,
  insertProduct,
  insertUser,
  maxUserId,
} from '../helpers/db-init';

const request: SuperTest<Test> = supertest(app);
const usersEndPoint = '/api/v1/users';

describe('GET /api/v1/users', () => {
  const user: User = { id: 0, email: '', firstName: '', lastName: '', isAdmin: false };
  const admin: User = { ...user, isAdmin: true };
  let token: string;
  let adminToken: string;

  beforeAll(() => {
    token = getJWTToken(user);
    adminToken = getJWTToken(admin);
  });

  beforeEach(async () => {
    await deleteAllUsers();
  });

  it('should respond a 412 error for non authenticated requests without token', async () => {
    const response: Response = await request.get(usersEndPoint);
    const { status, type, body } = response;
    expect(status).toBe(412);
    expect(type).toContain('json');
    expect(body.message).toMatch(/header.+missing/i);
  });

  it('should respond a 403 error for non admins', async () => {
    const response: Response = await request
      .get(usersEndPoint)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should respond an empty list of User when the table is empty', async () => {
    const response: Response = await request
      .get(usersEndPoint)
      .set('Authorization', `Bearer ${adminToken}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual([]);
  });

  it('should respond a list of User when the table has values', async () => {
    await insertUser();
    const response: Response = await request
      .get(usersEndPoint)
      .set('Authorization', `Bearer ${adminToken}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body.length > 0).toBeTruthy();
    expect(body).toContain({
      id: jasmine.any(Number),
      firstName: 'a',
      lastName: 'b',
      email: 'd@d.d',
      isAdmin: 0,
    });
  });

  it('should not include the password in the Users detail', async () => {
    await insertUser();
    const response: Response = await request
      .get(usersEndPoint)
      .set('Authorization', `Bearer ${adminToken}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body.length > 0).toBeTruthy();
    expect(Object.keys(body[0])).not.toContain('password');
  });
});

describe('GET /api/v1/users/:id', () => {
  let maxId: number;
  const user: User = { id: 0, email: '', firstName: '', lastName: '', isAdmin: false };
  let token: string;

  beforeEach(async () => {
    await deleteAllUsers();
    maxId = await maxUserId();
    token = getJWTToken(user);
  });

  it('should respond a 412 error for non authenticated requests without token', async () => {
    const inexistentId = maxId + 1;
    const response: Response = await request.get(`${usersEndPoint}/${inexistentId}`);
    const { status, type, body } = response;
    expect(status).toBe(412);
    expect(type).toContain('json');
    expect(body.message).toMatch(/header.+missing/i);
  });

  it('should respond a 403 error when it is not the current user', async () => {
    const response: Response = await request
      .get(`${usersEndPoint}/1`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should respond a 404 error when the id does not exist', async () => {
    const inexistentId = maxId + 1;
    user.id = inexistentId;
    token = getJWTToken(user);
    const response: Response = await request
      .get(`${usersEndPoint}/${inexistentId}`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should respond the User detail when it exists', async () => {
    const userId = maxId + 1;
    await insertUser();
    user.id = userId;
    token = getJWTToken(user);
    const response: Response = await request
      .get(`${usersEndPoint}/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({ id: userId, firstName: 'a', lastName: 'b', email: 'd@d.d', isAdmin: 0 });
  });

  it('should not include the password in the User detail', async () => {
    const userId = maxId + 1;
    await insertUser();
    user.id = userId;
    token = getJWTToken(user);
    const response: Response = await request
      .get(`${usersEndPoint}/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(Object.keys(body)).not.toContain('password');
  });
});

describe('POST /api/v1/users', () => {
  let user: { firstName: unknown; lastName: unknown; email: unknown };

  describe('data validation', () => {
    describe('"firstName" property', () => {
      beforeAll(async () => {
        await deleteAllUsers();
      });

      beforeEach(() => {
        user = { firstName: 'a', lastName: 'b', email: 'c@c.c' };
      });

      it('should respond 400 error if the firstName is missing', async () => {
        user.firstName = undefined;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+required/);
      });

      it('should respond 400 error if the firstName is an empty string', async () => {
        user.firstName = '';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/firstName.+not allowed to be empty/);

        user.firstName = null;
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: boolean true', async () => {
        user.firstName = true;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: number 1', async () => {
        user.firstName = 1;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: object {}', async () => {
        user.firstName = {};
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: array []', async () => {
        user.firstName = [];
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+must be a string/);
      });
    });

    describe('"lastName" property', () => {
      beforeAll(async () => {
        await deleteAllUsers();
      });

      beforeEach(() => {
        user = { firstName: 'a', lastName: 'b', email: 'c@c.c' };
      });

      it('should respond 400 error if the lastName is missing', async () => {
        user.lastName = undefined;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+required/);
      });

      it('should respond 400 error if the lastName is an empty string', async () => {
        user.lastName = '';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/lastName.+not allowed to be empty/);

        user.lastName = null;
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: boolean true', async () => {
        user.lastName = true;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: number 1', async () => {
        user.lastName = 1;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: object {}', async () => {
        user.lastName = {};
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: array []', async () => {
        user.lastName = [];
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+must be a string/);
      });
    });

    describe('"email" property', () => {
      beforeAll(async () => {
        await deleteAllUsers();
      });

      beforeEach(() => {
        user = { firstName: 'a', lastName: 'b', email: 'c@c.c' };
      });

      it('should respond 400 error if the email is missing', async () => {
        user.email = undefined;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+required/);
      });

      it('should respond 400 error if the email is an empty string', async () => {
        user.email = '';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+not allowed to be empty/);

        user.email = null;
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: boolean true', async () => {
        user.email = true;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: number 1', async () => {
        user.email = 1;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: object {}', async () => {
        user.email = {};
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: array []', async () => {
        user.email = [];
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is less than 3 characters', async () => {
        user.email = 'a';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+at least 3 characters long/);

        user.email = 'aa';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+at least 3 characters long/);
      });

      it('should respond 400 error if the email is not valid', async () => {
        user.email = 'aaa';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+must be a valid email/);

        user.email = 'aa@';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+must be a valid email/);

        user.email = '@aa';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+must be a valid email/);

        user.email = 'a@a';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+must be a valid email/);

        user.email = '@a.a';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+must be a valid email/);
      });
    });
  });

  describe('Happy path', () => {
    beforeAll(async () => {
      await deleteAllUsers();
    });

    it('should add a User for valid input data', async () => {
      const response: Response = await request
        .post(usersEndPoint)
        .send({ firstName: 'a', lastName: 'b', email: 'c@c.c', password: 'a' });
      const { status, type, body } = response;
      expect(status).toBe(201);
      expect(type).toContain('json');
      expect(body).toEqual({
        id: jasmine.any(Number),
        firstName: 'a',
        lastName: 'b',
        email: 'c@c.c',
        isAdmin: 0,
      });
    });
  });
});

describe('PUT /api/v1/users/:id', () => {
  let maxId: number;
  let user: { firstName: unknown; lastName: unknown; email: unknown };
  let id: number;
  let token: string;

  describe('Validation', () => {
    describe('"firstName" property', () => {
      beforeAll(async () => {
        await deleteAllUsers();
        const lastUser: User = await insertUser();
        id = lastUser.id;
        maxId = await maxUserId();
      });

      beforeEach(async () => {
        user = { firstName: 'x', lastName: 'y', email: 'z@z.z' };
        token = getJWTToken({ id, ...user } as User);
      });

      it('should respond a 412 error for non authenticated requests without token', async () => {
        const inexistentId = maxId + 1;
        const response: Response = await request.put(`${usersEndPoint}/${inexistentId}`).send(user);
        const { status, type, body } = response;
        expect(status).toBe(412);
        expect(type).toContain('json');
        expect(body.message).toMatch(/header.+missing/i);
      });

      it('should respond a 403 error when it is not the current user', async () => {
        const response: Response = await request
          .put(`${usersEndPoint}/1`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(403);
        expect(type).toContain('json');
        expect(body.message).toMatch(/not authorized/i);
      });

      it('should respond a 404 error when the id does not exist', async () => {
        const inexistentId = maxId + 1;
        token = getJWTToken({ id: inexistentId, ...user } as User);
        const response: Response = await request
          .put(`${usersEndPoint}/${inexistentId}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(404);
        expect(type).toContain('json');
        expect(body.message).toMatch(/not found/i);
      });

      it('should respond 400 error if the firstName is missing', async () => {
        user.firstName = undefined;
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+required/);
      });

      it('should respond 400 error if the firstName is an empty string', async () => {
        user.firstName = '';
        let response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/firstName.+not allowed to be empty/);

        user.firstName = null;
        response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: boolean true', async () => {
        user.firstName = true;
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: number 1', async () => {
        user.firstName = 1;
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: object {}', async () => {
        user.firstName = {};
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: array []', async () => {
        user.firstName = [];
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/firstName.+must be a string/);
      });
    });

    describe('"lastName" property', () => {
      beforeAll(async () => {
        await deleteAllUsers();
        const lastUser: User = await insertUser();
        id = lastUser.id;
      });

      beforeEach(async () => {
        user = { firstName: 'x', lastName: 'y', email: 'z@z.z' };
        token = getJWTToken({ id, ...user } as User);
      });

      it('should respond 400 error if the lastName is missing', async () => {
        user.lastName = undefined;
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+required/);
      });

      it('should respond 400 error if the lastName is an empty string', async () => {
        user.lastName = '';
        let response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/lastName.+not allowed to be empty/);

        user.lastName = null;
        response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: boolean true', async () => {
        user.lastName = true;
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: number 1', async () => {
        user.lastName = 1;
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: object {}', async () => {
        user.lastName = {};
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: array []', async () => {
        user.lastName = [];
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/lastName.+must be a string/);
      });
    });

    describe('"email" property', () => {
      beforeAll(async () => {
        await deleteAllUsers();
        const lastUser: User = await insertUser();
        id = lastUser.id;
      });

      beforeEach(async () => {
        user = { firstName: 'x', lastName: 'y', email: 'z@z.z' };
        token = getJWTToken({ id, ...user } as User);
      });

      it('should respond 400 error if the email is missing', async () => {
        user.email = undefined;
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+required/);
      });

      it('should respond 400 error if the email is an empty string', async () => {
        user.email = '';
        let response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+not allowed to be empty/);

        user.email = null;
        response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('json');
        expect(response.body.message).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: boolean true', async () => {
        user.email = true;
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: number 1', async () => {
        user.email = 1;
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: object {}', async () => {
        user.email = {};
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: array []', async () => {
        user.email = [];
        const response: Response = await request
          .put(`${usersEndPoint}/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(user);
        const { status, type, body } = response;
        expect(status).toBe(400);
        expect(type).toContain('json');
        expect(body.message).toMatch(/email.+must be a string/);
      });
    });
  });

  describe('Happy path', () => {
    beforeAll(async () => {
      await deleteAllUsers();
      const lastUser: User = await insertUser();
      id = lastUser.id;
    });

    beforeEach(async () => {
      user = { firstName: 'x', lastName: 'y', email: 'z@z.z' };
      token = getJWTToken({ id, ...user } as User);
    });

    it('should update the firstName "x" and lastName "y"', async () => {
      const response: Response = await request
        .put(`${usersEndPoint}/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(user);
      const { status, type, body } = response;
      expect(status).toBe(200);
      expect(type).toContain('json');
      expect(body).toEqual({ id, firstName: 'x', lastName: 'y', email: 'z@z.z', isAdmin: 0 });
    });
  });
});

describe('DELETE /api/v1/users/:id', () => {
  let maxId: number;
  let id: number;
  const issuer: User = { id: 0, firstName: '', lastName: '', email: '', isAdmin: true };
  let token: string;

  beforeAll(async () => {
    await deleteAllUsers();
    const lastUser: User = await insertUser();
    id = lastUser.id;
    maxId = await maxUserId();
  });

  beforeEach(() => {
    token = getJWTToken(issuer);
  });

  it('should respond a 412 error for non authenticated requests without token', async () => {
    const inexistentId = maxId + 1;
    const response: Response = await request.delete(`${usersEndPoint}/${inexistentId}`);
    const { status, type, body } = response;
    expect(status).toBe(412);
    expect(type).toContain('json');
    expect(body.message).toMatch(/header.+missing/i);
  });

  it('should respond a 403 error for non admins', async () => {
    const nonAdmin: User = { ...issuer, isAdmin: false };
    token = getJWTToken(nonAdmin);
    const response: Response = await request
      .get(usersEndPoint)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should respond a 404 error when the id does not exist', async () => {
    const inexistentId = maxId + 1;
    const response: Response = await request
      .delete(`${usersEndPoint}/${inexistentId}`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should delete the latest added user', async () => {
    const responseBeforeDelete: Response = await request
      .get(`${usersEndPoint}`)
      .set('Authorization', `Bearer ${token}`);
    const numberOfItemsBefore: number = responseBeforeDelete.body.length;

    let response: Response = await request
      .delete(`${usersEndPoint}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.type).toContain('json');
    expect(response.body).toEqual({
      id,
      firstName: 'a',
      lastName: 'b',
      email: 'd@d.d',
      isAdmin: 0,
    });

    const responseAfterDelete: Response = await request
      .get(`${usersEndPoint}`)
      .set('Authorization', `Bearer ${token}`);
    const numberOfItemsAfter: number = responseAfterDelete.body.length;
    expect(numberOfItemsBefore - 1).toBe(numberOfItemsAfter);

    response = await request
      .delete(`${usersEndPoint}/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.type).toContain('json');
    expect(response.body.message).toMatch(/not found/i);
  });
});

describe('GET /api/v1/users/:userId/orders', () => {
  let user: User;
  let otherUser: User;
  let userId: number;
  let token: string;

  beforeAll(async () => {
    await deleteAllUsers();
    user = await insertUser();
    otherUser = await insertUser(`${user.email}0`);
    userId = user.id;
    token = getJWTToken(user);
    await deleteAllOrders();
  });

  beforeEach(async () => {
    await deleteAllOrders();
  });

  it('should return a 403 error when the user is not the authenticated user', async () => {
    const response: Response = await request
      .get(`${usersEndPoint}/${otherUser.id}/orders`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should return the list of orders of the user', async () => {
    let response: Response = await request
      .get(`${usersEndPoint}/${userId}/orders`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.type).toContain('json');
    expect(response.body.length).toBe(0);

    const order: Order = await insertOrder(userId);
    response = await request
      .get(`${usersEndPoint}/${userId}/orders`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.type).toContain('json');
    expect(response.body.length).toBe(1);
    expect(response.body).toContain(order);

    const otherOrder: Order = await insertOrder(otherUser.id);
    response = await request
      .get(`${usersEndPoint}/${userId}/orders`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.type).toContain('json');
    expect(response.body.length).toBe(1);
    expect(response.body).not.toContain(otherOrder);
  });

  it('should return the list of active orders of the user', async () => {
    const activeOrder: Order = await insertOrder(userId);
    const completeOrder: Order = await insertOrder(userId, 'complete');
    const response: Response = await request
      .get(`${usersEndPoint}/${userId}/orders?status=active`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body.length).toBe(1);
    expect(body).not.toContain(completeOrder);
    expect(body).toContain(activeOrder);
  });

  it('should return the list of completed orders of the user', async () => {
    const activeOrder: Order = await insertOrder(userId);
    const completeOrder: Order = await insertOrder(userId, 'complete');
    const response: Response = await request
      .get(`${usersEndPoint}/${userId}/orders?status=complete`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body.length).toBe(1);
    expect(body).not.toContain(activeOrder);
    expect(body).toContain(completeOrder);
  });
});

describe('POST /api/v1/users/:userId/orders', () => {
  let user: User;
  let otherUser: User;
  let userId: number;
  let token: string;

  beforeAll(async () => {
    await deleteAllOrders();
    await deleteAllUsers();
    user = await insertUser();
    otherUser = await insertUser(`${user.email}0`);
    userId = user.id;
    token = getJWTToken(user);
  });

  beforeEach(async () => {
    await deleteAllOrders();
  });

  it('should return a 403 error when the user is not the authenticated user', async () => {
    const response: Response = await request
      .post(`${usersEndPoint}/${otherUser.id}/orders`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should return a 400 error when an active order already exist', async () => {
    await insertOrder(userId, 'active');
    const response: Response = await request
      .post(`${usersEndPoint}/${userId}/orders`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId });
    const { status, type, body } = response;
    expect(status).toBe(400);
    expect(type).toContain('json');
    expect(body.message).toMatch(/active order already exists/i);
  });

  it('should create an active order', async () => {
    const response: Response = await request
      .post(`${usersEndPoint}/${userId}/orders`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId });
    const { status, type, body } = response;
    expect(status).toBe(201);
    expect(type).toContain('json');
    expect(body).toEqual({ id: jasmine.any(Number), userId, status: 'active' });
  });
});

describe('GET /api/v1/users/:userId/orders/:orderId', () => {
  let user: User;
  let otherUser: User;
  let userId: number;
  let token: string;
  let order: Order;

  beforeAll(async () => {
    await deleteAllOrders();
    await deleteAllUsers();
    user = await insertUser();
    otherUser = await insertUser(`${user.email}0`);
    userId = user.id;
    token = getJWTToken(user);
  });

  beforeEach(async () => {
    await deleteAllOrders();
    order = await insertOrder(userId);
  });

  it('should return a 403 error when the user is not the authenticated user', async () => {
    const response: Response = await request
      .get(`${usersEndPoint}/${otherUser.id}/orders/${order.id}`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should return a 404 error when the order does not exist', async () => {
    const inexistentId: number = order.id + 1;
    const response: Response = await request
      .get(`${usersEndPoint}/${userId}/orders/${inexistentId}`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should return the given order with items empty', async () => {
    const response: Response = await request
      .get(`${usersEndPoint}/${userId}/orders/${order.id}`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({ id: order.id, userId, status: 'active', items: [] });
  });
});

describe('PUT /api/v1/users/:userId/orders/:orderId', () => {
  let user: User;
  let otherUser: User;
  let userId: number;
  let token: string;
  let order: Order;

  beforeAll(async () => {
    await deleteAllOrders();
    await deleteAllUsers();
    user = await insertUser();
    otherUser = await insertUser(`${user.email}0`);
    userId = user.id;
    token = getJWTToken(user);
  });

  beforeEach(async () => {
    await deleteAllOrders();
    order = await insertOrder(userId);
  });

  it('should return a 403 error when the user is not the authenticated user', async () => {
    const response: Response = await request
      .put(`${usersEndPoint}/${otherUser.id}/orders/${order.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should return a 404 error when the order does not exist', async () => {
    const inexistentId: number = order.id + 1;
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${inexistentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: inexistentId, userId, status: 'complete' });
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should return a 400 error if the status is missing', async () => {
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${order.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId });
    const { status, type, body } = response;
    expect(status).toBe(400);
    expect(type).toContain('json');
    expect(body.message).toMatch(/status.+required/i);
  });

  it('should return a 403 error if the order is already complete', async () => {
    const completeOrder: Order = await insertOrder(userId, 'complete');
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${completeOrder.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: completeOrder.id, userId, status: 'active' });
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/order that is not active is not allowed/i);
  });

  it('should update the status to "complete" for the active order', async () => {
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${order.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: order.id, userId, status: 'complete' });
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({ id: order.id, userId, status: 'complete' });
  });
});

describe('POST /api/v1/users/:userId/orders/:orderId/items', () => {
  let user: User;
  let otherUser: User;
  let userId: number;
  let token: string;
  let order: Order;
  let product: Product;

  beforeAll(async () => {
    await deleteAllOrderItems();
    await deleteAllOrders();
    await deleteAllProducts();
    await deleteAllCategories();
    await deleteAllUsers();
    user = await insertUser();
    otherUser = await insertUser(`${user.email}0`);
    userId = user.id;
    token = getJWTToken(user);
    const category: Category = await insertCategory();
    product = await insertProduct(category.id);
    order = await insertOrder(userId);
  });

  beforeEach(async () => {
    await deleteAllOrderItems();
  });

  it('should return a 403 error when the user is not the authenticated user', async () => {
    const response: Response = await request
      .post(`${usersEndPoint}/${otherUser.id}/orders/${order.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should return a 404 error when the order does not exist', async () => {
    const inexistentId: number = order.id + 1;
    const response: Response = await request
      .post(`${usersEndPoint}/${userId}/orders/${inexistentId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 0, quantity: 0 });
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should return a 403 error when the order is already complete', async () => {
    const completeOrder: Order = await insertOrder(userId, 'complete');
    const response: Response = await request
      .post(`${usersEndPoint}/${userId}/orders/${completeOrder.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 0, quantity: 0 });
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/order that is not active is not allowed/i);
  });

  it('should return a 400 error when the productId is missing', async () => {
    const response: Response = await request
      .post(`${usersEndPoint}/${userId}/orders/${order.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 0 });
    const { status, type, body } = response;
    expect(status).toBe(400);
    expect(type).toContain('json');
    expect(body.message).toMatch(/productId.+required/i);
  });

  it('should return a 400 error when the quantity is missing', async () => {
    const response: Response = await request
      .post(`${usersEndPoint}/${userId}/orders/${order.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 0 });
    const { status, type, body } = response;
    expect(status).toBe(400);
    expect(type).toContain('json');
    expect(body.message).toMatch(/quantity.+required/i);
  });

  it('should return a 500 error when the productId is already in the order', async () => {
    await insertOrderItem({ orderId: order.id, productId: product.id });
    const response: Response = await request
      .post(`${usersEndPoint}/${userId}/orders/${order.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: 0 });
    const { status, type, body } = response;
    expect(status).toBe(500);
    expect(type).toContain('json');
    expect(body.message).toMatch(/unexpected error/i);
  });

  it('should add the product in the order', async () => {
    const response: Response = await request
      .post(`${usersEndPoint}/${userId}/orders/${order.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: 0 });
    const { status, type, body } = response;
    expect(status).toBe(201);
    expect(type).toContain('json');
    expect(body).toEqual({
      id: jasmine.any(Number),
      productId: product.id,
      orderId: order.id,
      quantity: 0,
    });
  });
});

describe('PUT /api/v1/users/:userId/orders/:orderId/items/:itemId', () => {
  let user: User;
  let otherUser: User;
  let userId: number;
  let token: string;
  let order: Order;
  let product: Product;
  let orderItem: OrderItem;

  beforeAll(async () => {
    await deleteAllOrderItems();
    await deleteAllOrders();
    await deleteAllProducts();
    await deleteAllCategories();
    await deleteAllUsers();
    user = await insertUser();
    otherUser = await insertUser(`${user.email}0`);
    userId = user.id;
    token = getJWTToken(user);
    const category: Category = await insertCategory();
    product = await insertProduct(category.id);
    order = await insertOrder(userId);
  });

  beforeEach(async () => {
    await deleteAllOrderItems();
    orderItem = await insertOrderItem({ orderId: order.id, productId: product.id, quantity: 1 });
  });

  it('should return a 403 error when the user is not the authenticated user', async () => {
    const response: Response = await request
      .put(`${usersEndPoint}/${otherUser.id}/orders/${order.id}/items/0`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should return a 404 error when the order does not exist', async () => {
    const inexistentOrderId: number = order.id + 1;
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${inexistentOrderId}/items/0`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 0, orderId: inexistentOrderId, productId: 0, quantity: 0 });
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should return a 404 error when the order item does not exist', async () => {
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${order.id}/items/0`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 0, orderId: order.id, productId: 0, quantity: 0 });
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should return a 403 error when the order is already complete', async () => {
    const completeOrder: Order = await insertOrder(user.id, 'complete');
    const purchasedOrderItem: OrderItem = await insertOrderItem({
      orderId: completeOrder.id,
      productId: product.id,
    });
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${completeOrder.id}/items/${purchasedOrderItem.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: purchasedOrderItem.id,
        orderId: completeOrder.id,
        productId: product.id,
        quantity: 1,
      });
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/order that is not active is not allowed/i);
  });

  it('should return a 400 error when the productId is missing', async () => {
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${order.id}/items/${orderItem.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: orderItem.id, orderId: order.id, quantity: 1 });
    const { status, type, body } = response;
    expect(status).toBe(400);
    expect(type).toContain('json');
    expect(body.message).toMatch(/productId.+required/i);
  });

  it('should return a 400 error when the quantity is missing', async () => {
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${order.id}/items/${orderItem.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: orderItem.id, orderId: order.id, productId: product.id });
    const { status, type, body } = response;
    expect(status).toBe(400);
    expect(type).toContain('json');
    expect(body.message).toMatch(/quantity.+required/i);
  });

  it('should return a 400 error when the productId is not in the order yet', async () => {
    const category: Category = await insertCategory('a');
    const anotherProduct: Product = await insertProduct(category.id);
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${order.id}/items/${orderItem.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: orderItem.id, orderId: order.id, productId: anotherProduct.id, quantity: 1 });
    const { status, type, body } = response;
    expect(status).toBe(400);
    expect(type).toContain('json');
    expect(body.message).toMatch(/Mismatched product ids/i);
  });

  it('should update the product quantity in the order', async () => {
    const response: Response = await request
      .put(`${usersEndPoint}/${userId}/orders/${order.id}/items/${orderItem.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ id: orderItem.id, orderId: order.id, productId: product.id, quantity: 10 });
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({
      id: orderItem.id,
      orderId: order.id,
      productId: product.id,
      quantity: 10,
    });
  });
});

describe('DELETE /api/v1/users/:userId/orders/:orderId/items/:itemId', () => {
  let user: User;
  let otherUser: User;
  let userId: number;
  let token: string;
  let order: Order;
  let product: Product;
  let orderItem: OrderItem;

  beforeAll(async () => {
    await deleteAllOrderItems();
    await deleteAllOrders();
    await deleteAllProducts();
    await deleteAllCategories();
    await deleteAllUsers();
    user = await insertUser();
    otherUser = await insertUser(`${user.email}0`);
    userId = user.id;
    token = getJWTToken(user);
    const category: Category = await insertCategory();
    product = await insertProduct(category.id);
    order = await insertOrder(userId);
  });

  beforeEach(async () => {
    await deleteAllOrderItems();
    orderItem = await insertOrderItem({ orderId: order.id, productId: product.id, quantity: 1 });
  });

  it('should return a 403 error when the user is not the authenticated user', async () => {
    const response: Response = await request
      .delete(`${usersEndPoint}/${otherUser.id}/orders/${order.id}/items/0`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should return a 404 error when the order does not exist', async () => {
    const inexistentOrderId: number = order.id + 1;
    const response: Response = await request
      .delete(`${usersEndPoint}/${userId}/orders/${inexistentOrderId}/items/0`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should return a 404 error when the order item does not exist', async () => {
    const response: Response = await request
      .delete(`${usersEndPoint}/${userId}/orders/${order.id}/items/0`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/i);
  });

  it('should return a 403 error when the order is already complete', async () => {
    const completeOrder: Order = await insertOrder(user.id, 'complete');
    const purchasedOrderItem: OrderItem = await insertOrderItem({
      orderId: completeOrder.id,
      productId: product.id,
    });
    const response: Response = await request
      .delete(
        `${usersEndPoint}/${userId}/orders/${completeOrder.id}/items/${purchasedOrderItem.id}`
      )
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/order that is not active is not allowed/i);
  });

  it('should remove the product from the order', async () => {
    const response: Response = await request
      .delete(`${usersEndPoint}/${userId}/orders/${order.id}/items/${orderItem.id}`)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({
      id: orderItem.id,
      orderId: order.id,
      productId: product.id,
      quantity: 1,
    });
  });
});
