import supertest, { Response, SuperTest, Test } from 'supertest';
import app from '../../app';
import { User } from '../../models/user';
import { getJWTToken } from '../../services/security.service';

const request: SuperTest<Test> = supertest(app);
const ordersEndPoint = '/api/v1/orders';

describe('GET /api/v1/orders', () => {
  const admin: User = { id: 0, email: '', firstName: '', lastName: '', isAdmin: true };
  const token: string = getJWTToken(admin);
  const nonAdminToken: string = getJWTToken({ ...admin, isAdmin: false });

  it('should respond a 403 error for non admins', async () => {
    const response: Response = await request
      .get(ordersEndPoint)
      .set('Authorization', `Bearer ${nonAdminToken}`);
    const { status, type, body } = response;
    expect(status).toBe(403);
    expect(type).toContain('json');
    expect(body.message).toMatch(/not authorized/i);
  });

  it('should respond a list for admins', async () => {
    const response: Response = await request
      .get(ordersEndPoint)
      .set('Authorization', `Bearer ${token}`);
    const { status, type, body } = response;
    expect(status).toBe(200);
    expect(type).toContain('json');
    expect(body).toEqual(jasmine.any(Array));
  });
});
