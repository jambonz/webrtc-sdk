/**
 * Integration tests: Outbound Calls
 *
 * Tests making calls, call state transitions, hangup, and noAnswerTimeout.
 *
 * Required env vars in .env.test:
 *   JAMBONZ_SIP_SERVER, JAMBONZ_SIP_USERNAME, JAMBONZ_SIP_PASSWORD, JAMBONZ_CALL_TARGET
 */
import { test, expect, Page } from '@playwright/test';

const SERVER = process.env.JAMBONZ_SIP_SERVER!;
const USERNAME = process.env.JAMBONZ_SIP_USERNAME!;
const PASSWORD = process.env.JAMBONZ_SIP_PASSWORD!;
const TARGET = process.env.JAMBONZ_CALL_TARGET!;

test.beforeEach(async ({ page }) => {
  test.skip(!SERVER || !USERNAME || !PASSWORD || !TARGET, 'Missing JAMBONZ_ env vars');
  await page.goto('http://localhost:5199');
  await expect(page.locator('#status')).toHaveText('harness-loaded');

  // Connect first
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
    try {
      (window as any).__call?.hangup();
    } catch {}
    try {
      (window as any).__client?.disconnect();
    } catch {}
  });
});

test.describe('Outbound Calls', () => {
  test('should initiate a call and return a JambonzCall', async ({ page }) => {
    const result = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        const call = client.call(target);
        (window as any).__call = call;
        return {
          hasId: typeof call.id === 'string' && call.id.length > 0,
          hasState: typeof call.state === 'string',
          direction: call.direction,
        };
      },
      { target: TARGET },
    );

    expect(result.hasId).toBe(true);
    expect(result.hasState).toBe(true);
    expect(result.direction).toBe('outbound');
  });

  test('should have correct call properties after initiating', async ({ page }) => {
    const props = await page.evaluate(
      ({ target }) => {
        const client = (window as any).__client;
        const call = client.call(target);
        (window as any).__call = call;
        return {
          id: typeof call.id,
          direction: call.direction,
          isMuted: call.isMuted,
          isHeld: call.isHeld,
          duration: call.duration,
        };
      },
      { target: TARGET },
    );

    expect(props.id).toBe('string');
    expect(props.direction).toBe('outbound');
    expect(props.isMuted).toBe(false);
    expect(props.isHeld).toBe(false);
    expect(props.duration).toBe(0);
  });

  test('should hang up a call', async ({ page }) => {
    const endReason = await page.evaluate(
      ({ target }) => {
        return new Promise<string>((resolve) => {
          const client = (window as any).__client;
          const call = client.call(target);
          (window as any).__call = call;

          call.on('ended', (cause: { reason: string }) => resolve(cause.reason));
          call.on('failed', (cause: { reason: string }) => resolve(cause.reason));

          // Give it a moment to connect, then hang up
          setTimeout(() => call.hangup(), 2000);
        });
      },
      { target: TARGET },
    );

    expect(endReason).toBeTruthy();
  });

  test('should auto-terminate on noAnswerTimeout', async ({ page }, testInfo) => {
    testInfo.setTimeout(90_000); // This test needs extra time
    const result = await page.evaluate(
      ({ target }) => {
        return new Promise<{ reason: string; elapsed: number }>((resolve) => {
          const client = (window as any).__client;
          const start = Date.now();

          // 5 second timeout — call should be terminated if not answered
          const call = client.call(target, { noAnswerTimeout: 5 });
          (window as any).__call = call;

          call.on('ended', (cause: { reason: string }) =>
            resolve({ reason: cause.reason, elapsed: Date.now() - start }),
          );
          call.on('failed', (cause: { reason: string }) =>
            resolve({ reason: cause.reason, elapsed: Date.now() - start }),
          );
        });
      },
      { target: TARGET },
    );

    // Should terminate within ~5-8 seconds (5s timeout + some overhead)
    expect(result.elapsed).toBeLessThan(10_000);
    expect(result.reason).toBeTruthy();
  });

  test('should throw if calling when not connected', async ({ page }) => {
    const error = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const client = sdk.createJambonzClient({
        server: 'wss://example.com',
        username: 'test',
        password: 'test',
      });
      try {
        client.call('1234');
        return null;
      } catch (err: any) {
        return err.message;
      }
    });

    expect(error).toContain('Not connected');
  });
});
