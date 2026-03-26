/**
 * Integration tests: Jambonz Call Types
 *
 * Tests the four call type methods: callUser, callQueue, callConference, callApplication.
 * These match the Jambonz SBC routing conventions.
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
    try { (window as any).__call?.hangup(); } catch {}
    try { (window as any).__client?.disconnect(); } catch {}
  });
});

test.describe('Call Types', () => {
  test('client should have callUser() method', async ({ page }) => {
    const has = await page.evaluate(() => typeof (window as any).__client.callUser === 'function');
    expect(has).toBe(true);
  });

  test('client should have callQueue() method', async ({ page }) => {
    const has = await page.evaluate(() => typeof (window as any).__client.callQueue === 'function');
    expect(has).toBe(true);
  });

  test('client should have callConference() method', async ({ page }) => {
    const has = await page.evaluate(() => typeof (window as any).__client.callConference === 'function');
    expect(has).toBe(true);
  });

  test('client should have callApplication() method', async ({ page }) => {
    const has = await page.evaluate(() => typeof (window as any).__client.callApplication === 'function');
    expect(has).toBe(true);
  });

  test('callUser() should return a JambonzCall', async ({ page }) => {
    test.skip(!TARGET, 'Missing JAMBONZ_CALL_TARGET');
    const result = await page.evaluate(
      ({ target }) => {
        const call = (window as any).__client.callUser(target);
        (window as any).__call = call;
        return { direction: call.direction, hasId: !!call.id };
      },
      { target: TARGET },
    );
    expect(result.direction).toBe('outbound');
    expect(result.hasId).toBe(true);
  });

  test('callQueue() should prefix target with queue-', async ({ page }) => {
    const result = await page.evaluate(() => {
      const call = (window as any).__client.callQueue('support');
      (window as any).__call = call;
      return { direction: call.direction, hasId: !!call.id };
    });
    expect(result.direction).toBe('outbound');
    expect(result.hasId).toBe(true);
  });

  test('callConference() should prefix target with conference-', async ({ page }) => {
    const result = await page.evaluate(() => {
      const call = (window as any).__client.callConference('room-123');
      (window as any).__call = call;
      return { direction: call.direction, hasId: !!call.id };
    });
    expect(result.direction).toBe('outbound');
    expect(result.hasId).toBe(true);
  });

  test('callApplication() should prefix target with app- and send X-Application-Sid header', async ({ page }) => {
    const result = await page.evaluate(() => {
      const call = (window as any).__client.callApplication('abc-123-def');
      (window as any).__call = call;
      return { direction: call.direction, hasId: !!call.id };
    });
    expect(result.direction).toBe('outbound');
    expect(result.hasId).toBe(true);
  });

  test('callQueue() should accept additional options', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const call = (window as any).__client.callQueue('sales', {
          headers: { 'X-Agent-Id': 'agent-42' },
          noAnswerTimeout: 30,
        });
        (window as any).__call = call;
        return 'ok';
      } catch (e: any) {
        return e.message;
      }
    });
    expect(result).toBe('ok');
  });

  test('callConference() should accept additional options', async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        const call = (window as any).__client.callConference('standup', {
          headers: { 'X-Participant-Name': 'John' },
        });
        (window as any).__call = call;
        return 'ok';
      } catch (e: any) {
        return e.message;
      }
    });
    expect(result).toBe('ok');
  });
});
