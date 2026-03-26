/**
 * Integration tests: SIP MESSAGE Support
 *
 * Tests the client.sendMessage() method and message event.
 */
import { test, expect } from '@playwright/test';

const SERVER = process.env.JAMBONZ_SIP_SERVER!;
const USERNAME = process.env.JAMBONZ_SIP_USERNAME!;
const PASSWORD = process.env.JAMBONZ_SIP_PASSWORD!;
const TARGET = process.env.JAMBONZ_CALL_TARGET!;

test.beforeEach(async ({ page }) => {
  test.skip(!SERVER || !USERNAME || !PASSWORD, 'Missing JAMBONZ_ env vars');
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
    try { (window as any).__client?.disconnect(); } catch {}
  });
});

test.describe('SIP MESSAGE', () => {
  test('client should have sendMessage() method', async ({ page }) => {
    const hasMethod = await page.evaluate(() => {
      return typeof (window as any).__client.sendMessage === 'function';
    });
    expect(hasMethod).toBe(true);
  });

  test('sendMessage() should not throw with valid target', async ({ page }) => {
    test.skip(!TARGET, 'Missing JAMBONZ_CALL_TARGET');

    const result = await page.evaluate(
      ({ target }) => {
        try {
          (window as any).__client.sendMessage(target, 'Hello from test');
          return 'ok';
        } catch (err: any) {
          return `error: ${err.message}`;
        }
      },
      { target: TARGET },
    );
    expect(result).toBe('ok');
  });

  test('sendMessage() should accept custom content type', async ({ page }) => {
    test.skip(!TARGET, 'Missing JAMBONZ_CALL_TARGET');

    const result = await page.evaluate(
      ({ target }) => {
        try {
          (window as any).__client.sendMessage(
            target,
            JSON.stringify({ type: 'test' }),
            'application/json',
          );
          return 'ok';
        } catch (err: any) {
          return `error: ${err.message}`;
        }
      },
      { target: TARGET },
    );
    expect(result).toBe('ok');
  });

  test('sendMessage() should throw when not connected', async ({ page }) => {
    const error = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const client = sdk.createJambonzClient({
        server: 'wss://example.com',
        username: 'test',
        password: 'test',
      });
      try {
        client.sendMessage('sip:someone@example.com', 'Hello');
        return null;
      } catch (err: any) {
        return err.message;
      }
    });
    expect(error).toContain('Not connected');
  });

  test('client should have message event listener support', async ({ page }) => {
    const canListen = await page.evaluate(() => {
      const client = (window as any).__client;
      let received = false;
      const handler = () => { received = true; };
      client.on('message', handler);
      client.off('message', handler);
      return true; // No error thrown
    });
    expect(canListen).toBe(true);
  });
});
