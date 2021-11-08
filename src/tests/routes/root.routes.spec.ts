import supertest, { Response, SuperTest, Test } from 'supertest';
import app from '../../index';

const request: SuperTest<Test> = supertest(app);

describe('GET /', () => {
  it('should respond a json with a hello property', async () => {
    const response: Response = await request.get('/');
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual({ hello: 'world' });
  });
});
