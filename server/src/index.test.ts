import request from 'supertest';
import { openTestDatabase } from './db/helper';
import { createApp } from './index';

describe('createApp', () => {
  it('serves the health endpoint', async () => {
    const { db, cleanup } = openTestDatabase();

    try {
      const response = await request(createApp(db)).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    } finally {
      cleanup();
    }
  });
});
