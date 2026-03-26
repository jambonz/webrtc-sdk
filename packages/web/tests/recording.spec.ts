/**
 * Integration tests: Call Recording Trigger
 *
 * Tests the record option on call().
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
    try { (window as any).__call?.hangup(); } catch {}
    try { (window as any).__client?.disconnect(); } catch {}
  });
});

test.describe('Call Recording Trigger', () => {
  test('should accept record: true option on call()', async ({ page }) => {
    const result = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        try {
          const call = client.call(target, { record: true });
          (window as any).__call = call;
          setTimeout(() => call.hangup(), 2000);
          return 'ok';
        } catch (err: any) {
          return `error: ${err.message}`;
        }
      },
      { target: TARGET },
    );
    expect(result).toBe('ok');
  });

  test('should accept record: false option on call()', async ({ page }) => {
    const result = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        try {
          const call = client.call(target, { record: false });
          (window as any).__call = call;
          setTimeout(() => call.hangup(), 2000);
          return 'ok';
        } catch (err: any) {
          return `error: ${err.message}`;
        }
      },
      { target: TARGET },
    );
    expect(result).toBe('ok');
  });
});
