const { test, expect } = require('@playwright/test');

test.describe('Server API', () => {
  test('GET /state returns JSON', async ({ request }) => {
    const response = await request.get('/state');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');

    const data = await response.json();
    expect(data).toHaveProperty('connected');
    expect(data).toHaveProperty('params');
    expect(data).toHaveProperty('activeApp');
  });

  test('POST /keypress/:key accepts button events', async ({ request }) => {
    const response = await request.post('/keypress/Select');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toEqual({ ok: true, key: 'Select' });
  });

  test('POST /keypress/:key with various buttons', async ({ request }) => {
    const buttons = ['Up', 'Down', 'Left', 'Right', 'Home', 'Back', 'Play'];

    for (const button of buttons) {
      const response = await request.post(`/keypress/${button}`);
      expect(response.ok()).toBeTruthy();
    }
  });
});
