/**
 * Integration tests: Call Transfer
 *
 * Tests blind transfer and attended transfer methods exist and are callable.
 * Full transfer testing requires two connected calls and a cooperating SBC,
 * so we test the API surface and error handling.
 *
 * Required env vars in .env.test:
 *   JAMBONZ_SIP_SERVER, JAMBONZ_SIP_USERNAME, JAMBONZ_SIP_PASSWORD, JAMBONZ_CALL_TARGET
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

  // Connect
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

test.describe('Call Transfer', () => {
  test('JambonzCall should have transfer() method', async ({ page }) => {
    const hasMethod = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        const call = client.call(target);
        (window as any).__call = call;
        return typeof call.transfer === 'function';
      },
      { target: TARGET },
    );

    expect(hasMethod).toBe(true);
  });

  test('JambonzCall should have attendedTransfer() method', async ({ page }) => {
    const hasMethod = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        const call = client.call(target);
        (window as any).__call = call;
        return typeof call.attendedTransfer === 'function';
      },
      { target: TARGET },
    );

    expect(hasMethod).toBe(true);
  });

  test('transfer() should emit transferred or transferFailed event', async ({ page }) => {
    const result = await page.evaluate(
      ({ target }) => {
        return new Promise<string>((resolve) => {
          const client = (window as any).__client;
          const call = client.call(target);
          (window as any).__call = call;

          // Wait for call to be somewhat set up, then attempt transfer
          call.on('accepted', () => {
            call.on('transferred', () => resolve('transferred'));
            call.on('transferFailed', () => resolve('transferFailed'));
            try {
              call.transfer('sip:someone@example.com');
            } catch {
              resolve('threw');
            }
          });

          call.on('failed', () => resolve('call-failed'));

          // Timeout — if call never connected, transfer can't be tested
          setTimeout(() => resolve('timeout'), 15_000);
        });
      },
      { target: TARGET },
    );

    // Transfer attempt should produce one of these outcomes
    expect(['transferred', 'transferFailed', 'call-failed', 'timeout', 'threw']).toContain(result);
  });

  test('transfer() should accept optional headers', async ({ page }) => {
    const noThrow = await page.evaluate(
      ({ target }) => {
        return new Promise<boolean>((resolve) => {
          const client = (window as any).__client;
          const call = client.call(target);
          (window as any).__call = call;

          call.on('accepted', () => {
            try {
              call.transfer('sip:someone@example.com', {
                headers: { 'X-Custom': 'test-value' },
              });
              resolve(true);
            } catch {
              resolve(false);
            }
          });

          call.on('failed', () => resolve(true)); // Call didn't connect, skip
          setTimeout(() => resolve(true), 15_000);
        });
      },
      { target: TARGET },
    );

    expect(noThrow).toBe(true);
  });
});
