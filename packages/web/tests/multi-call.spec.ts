/**
 * Integration tests: Multiple Simultaneous Calls
 *
 * Tests the client.calls getter, client.callCount, and making
 * multiple calls concurrently.
 */
import { test, expect } from '@playwright/test';

const SERVER = process.env.JAMBONZ_SIP_SERVER!;
const USERNAME = process.env.JAMBONZ_SIP_USERNAME!;
const PASSWORD = process.env.JAMBONZ_SIP_PASSWORD!;
const TARGET = process.env.JAMBONZ_CALL_TARGET!;

test.beforeEach(async ({ page }) => {
  test.skip(!SERVER || !USERNAME || !PASSWORD || !TARGET, 'Missing JAMBONZ_ env vars');
  await page.goto('http://localhost:5199');
  await expect(page.locator('#status')).toHaveText('harness-loaded');

  await page.evaluate(
    ({ server, username, password }) => {
      const sdk = (window as any).JambonzSDK;
      const client = sdk.createJambonzClient({ server, username, password });
      (window as any).__client = client;
      return client.connect();
    },
    { server: SERVER, username: USERNAME, password: PASSWORD },
  );
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    const client = (window as any).__client;
    if (client) {
      // Hang up all tracked calls
      for (const call of client.calls.values()) {
        try { call.hangup(); } catch {}
      }
      client.disconnect();
    }
  });
});

test.describe('Multiple Simultaneous Calls', () => {
  test('client.calls should be a Map', async ({ page }) => {
    const isMap = await page.evaluate(() => {
      const client = (window as any).__client;
      return client.calls instanceof Map;
    });
    expect(isMap).toBe(true);
  });

  test('client.callCount should be 0 initially', async ({ page }) => {
    const count = await page.evaluate(() => (window as any).__client.callCount);
    expect(count).toBe(0);
  });

  test('client.callCount should increase when making a call', async ({ page }) => {
    const count = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        const call = client.call(target);
        (window as any).__call = call;
        return client.callCount;
      },
      { target: TARGET },
    );
    expect(count).toBe(1);
  });

  test('should support making two calls and tracking both', async ({ page }) => {
    const counts = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        const call1 = client.call(target);
        const after1 = client.callCount;
        const call2 = client.call(target);
        const after2 = client.callCount;
        (window as any).__call = call1;
        (window as any).__call2 = call2;
        return { after1, after2 };
      },
      { target: TARGET },
    );
    expect(counts.after1).toBe(1);
    expect(counts.after2).toBe(2);
  });

  test('callCount should decrease when a call ends', async ({ page }) => {
    const result = await page.evaluate(
      ({ target }) => {
        return new Promise<{ before: number; after: number }>((resolve) => {
          const client = (window as any).__client;
          const call = client.call(target);
          (window as any).__call = call;
          const before = client.callCount;

          call.on('ended', () => resolve({ before, after: client.callCount }));
          call.on('failed', () => resolve({ before, after: client.callCount }));

          setTimeout(() => call.hangup(), 2000);
        });
      },
      { target: TARGET },
    );
    expect(result.before).toBe(1);
    expect(result.after).toBe(0);
  });
});
