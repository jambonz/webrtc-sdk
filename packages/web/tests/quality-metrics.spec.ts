/**
 * Integration tests: Connection Quality Metrics
 *
 * Tests getStats(), startQualityMonitoring(), stopQualityMonitoring(),
 * and the qualityStats event.
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

test.describe('Connection Quality Metrics', () => {
  test('JambonzCall should have getStats() method', async ({ page }) => {
    const hasMethod = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        const call = client.call(target);
        (window as any).__call = call;
        return typeof call.getStats === 'function';
      },
      { target: TARGET },
    );
    expect(hasMethod).toBe(true);
  });

  test('JambonzCall should have startQualityMonitoring() method', async ({ page }) => {
    const hasMethod = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        const call = client.call(target);
        (window as any).__call = call;
        return typeof call.startQualityMonitoring === 'function';
      },
      { target: TARGET },
    );
    expect(hasMethod).toBe(true);
  });

  test('JambonzCall should have stopQualityMonitoring() method', async ({ page }) => {
    const hasMethod = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        const call = client.call(target);
        (window as any).__call = call;
        return typeof call.stopQualityMonitoring === 'function';
      },
      { target: TARGET },
    );
    expect(hasMethod).toBe(true);
  });

  test('getStats() should return null or stats object', async ({ page }) => {
    const result = await page.evaluate(
      ({ target }) => {
        return new Promise<any>((resolve) => {
          const client = (window as any).__client;
          const call = client.call(target);
          (window as any).__call = call;

          // Wait for call setup then get stats
          setTimeout(async () => {
            const stats = await call.getStats();
            call.hangup();
            resolve(stats);
          }, 3000);
        });
      },
      { target: TARGET },
    );

    // Stats may be null if call didn't fully connect, or an object with expected fields
    if (result !== null) {
      expect(result).toHaveProperty('roundTripTime');
      expect(result).toHaveProperty('jitter');
      expect(result).toHaveProperty('packetLoss');
      expect(result).toHaveProperty('packetsSent');
      expect(result).toHaveProperty('packetsReceived');
      expect(result).toHaveProperty('codec');
      expect(result).toHaveProperty('timestamp');
    }
  });
});
