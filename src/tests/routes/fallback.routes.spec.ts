import supertest, { Response, SuperTest, Test } from 'supertest';
import app from '../../app';

const request: SuperTest<Test> = supertest(app);

describe('GET /unexisting-endpoint', () => {
  it('should respond not found with 404 status when the endpoint does not exist', async () => {
    const response: Response = await request.get('/unexisting-endpoint');
    const { status, type, body } = response;
    expect(status).toBe(404);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not found/);
  });
});
