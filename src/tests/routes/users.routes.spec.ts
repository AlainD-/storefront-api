import supertest, { Response, SuperTest, Test } from 'supertest';
import app from '../../index';
import DatabaseService from '../../services/database.service';
import { User } from '../../models/user';

const request: SuperTest<Test> = supertest(app);
const usersEndPoint = '/api/v1/users';

const deleteAllUsers = async (): Promise<void> => {
  const query = 'DELETE FROM users;';
  await DatabaseService.runQuery<User>(query);
};

const insertUser = async (): Promise<User> => {
  const query =
    'INSERT INTO users (first_name, last_name, password, email) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name AS "firstName", last_name AS "lastName", is_admin AS "isAdmin";';
  const users: User[] = await DatabaseService.runQuery<User>(query, ['a', 'b', 'c', 'd@d.d']);
  return users[0];
};

const maxUserId = async (): Promise<number> => {
  const query = `SELECT NEXTVAL(pg_get_serial_sequence('users', 'id')) AS "maxId";`;
  const ids: { maxId: string }[] = await DatabaseService.runQuery<{ maxId: string }>(query);
  return parseInt(ids[0]?.maxId, 10);
};

describe('GET /api/v1/users', () => {
  beforeEach(async () => {
    await deleteAllUsers();
  });

  it('should respond an empty list of User when the table is empty', async () => {
    const response: Response = await request.get(usersEndPoint);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual([]);
  });

  it('should respond a list of User when the table has values', async () => {
    await insertUser();
    const response: Response = await request.get(usersEndPoint);
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
    const response: Response = await request.get(usersEndPoint);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body.length > 0).toBeTruthy();
    expect(Object.keys(body[0])).not.toContain('password');
  });
});

describe('GET /api/v1/users/:id', () => {
  let maxId: number;

  beforeEach(async () => {
    await deleteAllUsers();
    maxId = await maxUserId();
  });

  it('should respond a 404 error when the id does not exist', async () => {
    const inexistentId = maxId + 1;
    const response: Response = await request.get(`${usersEndPoint}/${inexistentId}`);
    const { status, type, text } = response;
    expect(status).toBe(404);
    expect(type).toContain('text');
    expect(text).toMatch(/not found/i);
  });

  it('should respond a 400 error if the id is not a number', async () => {
    const response: Response = await request.get(`${usersEndPoint}/a`);
    const { status, type, text } = response;
    expect(status).toBe(400);
    expect(type).toContain('text');
    expect(text).toMatch(/not a valid number/i);
  });

  it('should respond the User detail when it exists', async () => {
    const userId = maxId + 1;
    await insertUser();
    const response: Response = await request.get(`${usersEndPoint}/${userId}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({ id: userId, firstName: 'a', lastName: 'b', email: 'd@d.d', isAdmin: 0 });
  });

  it('should not include the password in the User detail', async () => {
    const userId = maxId + 1;
    await insertUser();
    const response: Response = await request.get(`${usersEndPoint}/${userId}`);
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
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+required/);
      });

      it('should respond 400 error if the firstName is an empty string', async () => {
        user.firstName = '';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/firstName.+not allowed to be empty/);

        user.firstName = null;
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: boolean true', async () => {
        user.firstName = true;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: number 1', async () => {
        user.firstName = 1;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: object {}', async () => {
        user.firstName = {};
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: array []', async () => {
        user.firstName = [];
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+must be a string/);
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
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+required/);
      });

      it('should respond 400 error if the lastName is an empty string', async () => {
        user.lastName = '';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/lastName.+not allowed to be empty/);

        user.lastName = null;
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: boolean true', async () => {
        user.lastName = true;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: number 1', async () => {
        user.lastName = 1;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: object {}', async () => {
        user.lastName = {};
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: array []', async () => {
        user.lastName = [];
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+must be a string/);
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
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+required/);
      });

      it('should respond 400 error if the email is an empty string', async () => {
        user.email = '';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+not allowed to be empty/);

        user.email = null;
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: boolean true', async () => {
        user.email = true;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: number 1', async () => {
        user.email = 1;
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: object {}', async () => {
        user.email = {};
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: array []', async () => {
        user.email = [];
        const response: Response = await request.post(usersEndPoint).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is less than 3 characters', async () => {
        user.email = 'a';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+at least 3 characters long/);

        user.email = 'aa';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+at least 3 characters long/);
      });

      it('should respond 400 error if the email is not valid', async () => {
        user.email = 'aaa';
        let response: Response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+must be a valid email/);

        user.email = 'aa@';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+must be a valid email/);

        user.email = '@aa';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+must be a valid email/);

        user.email = 'a@a';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+must be a valid email/);

        user.email = '@a.a';
        response = await request.post(usersEndPoint).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+must be a valid email/);
      });
    });
  });

  describe('Happy path', () => {
    beforeAll(async () => {
      await deleteAllUsers();
    });

    beforeEach(() => {
      user = { firstName: 'a', lastName: 'b', email: 'c@c.c' };
    });

    it('should add a User for valid input data', async () => {
      const response: Response = await request.post(usersEndPoint).send(user);
      const { status, type, body } = response;
      expect(status).toBe(200);
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
      });

      it('should respond a 404 error when the id does not exist', async () => {
        const inexistentId = maxId + 1;
        const response: Response = await request.put(`${usersEndPoint}/${inexistentId}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(404);
        expect(type).toContain('text');
        expect(text).toMatch(/not found/i);
      });

      it('should respond 400 error if the firstName is missing', async () => {
        user.firstName = undefined;
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+required/);
      });

      it('should respond 400 error if the firstName is an empty string', async () => {
        user.firstName = '';
        let response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/firstName.+not allowed to be empty/);

        user.firstName = null;
        response = await request.put(`${usersEndPoint}/${id}`).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: boolean true', async () => {
        user.firstName = true;
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: number 1', async () => {
        user.firstName = 1;
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: object {}', async () => {
        user.firstName = {};
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+must be a string/);
      });

      it('should respond 400 error if the firstName is not a string: array []', async () => {
        user.firstName = [];
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/firstName.+must be a string/);
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
      });

      it('should respond 400 error if the lastName is missing', async () => {
        user.lastName = undefined;
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+required/);
      });

      it('should respond 400 error if the lastName is an empty string', async () => {
        user.lastName = '';
        let response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/lastName.+not allowed to be empty/);

        user.lastName = null;
        response = await request.put(`${usersEndPoint}/${id}`).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: boolean true', async () => {
        user.lastName = true;
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: number 1', async () => {
        user.lastName = 1;
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: object {}', async () => {
        user.lastName = {};
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+must be a string/);
      });

      it('should respond 400 error if the lastName is not a string: array []', async () => {
        user.lastName = [];
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/lastName.+must be a string/);
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
      });

      it('should respond 400 error if the email is missing', async () => {
        user.email = undefined;
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+required/);
      });

      it('should respond 400 error if the email is an empty string', async () => {
        user.email = '';
        let response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+not allowed to be empty/);

        user.email = null;
        response = await request.put(`${usersEndPoint}/${id}`).send(user);
        expect(response.status).toBe(400);
        expect(response.type).toContain('text');
        expect(response.text).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: boolean true', async () => {
        user.email = true;
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: number 1', async () => {
        user.email = 1;
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: object {}', async () => {
        user.email = {};
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+must be a string/);
      });

      it('should respond 400 error if the email is not a string: array []', async () => {
        user.email = [];
        const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
        const { status, type, text } = response;
        expect(status).toBe(400);
        expect(type).toContain('text');
        expect(text).toMatch(/email.+must be a string/);
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
    });

    it('should update the firstName "x" and lastName "y"', async () => {
      const response: Response = await request.put(`${usersEndPoint}/${id}`).send(user);
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

  beforeAll(async () => {
    await deleteAllUsers();
    const lastUser: User = await insertUser();
    id = lastUser.id;
    maxId = await maxUserId();
  });

  it('should respond a 404 error when the id does not exist', async () => {
    const inexistentId = maxId + 1;
    const response: Response = await request.delete(`${usersEndPoint}/${inexistentId}`);
    const { status, type, text } = response;
    expect(status).toBe(404);
    expect(type).toContain('text');
    expect(text).toMatch(/not found/i);
  });

  it('should delete the latest added user', async () => {
    const responseBeforeDelete: Response = await request.get(`${usersEndPoint}`);
    const numberOfUsersBefore: number = responseBeforeDelete.body.length;

    const response: Response = await request.delete(`${usersEndPoint}/${id}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({ id, firstName: 'a', lastName: 'b', email: 'd@d.d', isAdmin: 0 });

    const responseAfterDelete: Response = await request.get(`${usersEndPoint}`);
    const numberOfUsersAfter: number = responseAfterDelete.body.length;

    expect(numberOfUsersBefore - 1 === numberOfUsersAfter).toBeTruthy();
  });
});