/**
 * Integration tests: Event System
 *
 * Tests that all documented client and call events fire correctly.
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
  test.skip(!SERVER || !USERNAME || !PASSWORD, 'Missing JAMBONZ_ env vars');
  await page.goto('http://localhost:5199');
  await expect(page.locator('#status')).toHaveText('harness-loaded');
});

test.describe('Client Events', () => {
  test('should fire registered, connected, stateChanged on connect', async ({ page }) => {
    const events = await page.evaluate(
      ({ server, username, password }) => {
        return new Promise<string[]>((resolve) => {
          const sdk = (window as any).JambonzSDK;
          const client = sdk.createJambonzClient({ server, username, password });
          (window as any).__client = client;
          const fired: string[] = [];

          client.on('stateChanged', () => fired.push('stateChanged'));
          client.on('connected', () => fired.push('connected'));
          client.on('registered', () => fired.push('registered'));
          client.on('error', () => fired.push('error'));

          client.connect().then(() => resolve(fired));
        });
      },
      { server: SERVER, username: USERNAME, password: PASSWORD },
    );

    expect(events).toContain('stateChanged');
    expect(events).toContain('connected');
    expect(events).toContain('registered');
    expect(events).not.toContain('error');
  });

  test('should fire registrationFailed on bad credentials', async ({ page }) => {
    const events = await page.evaluate(
      ({ server }) => {
        return new Promise<string[]>((resolve) => {
          const sdk = (window as any).JambonzSDK;
          const client = sdk.createJambonzClient({
            server,
            username: 'bad_user_xyz',
            password: 'wrong',
          });
          const fired: string[] = [];

          client.on('stateChanged', (s: string) => fired.push(`stateChanged:${s}`));
          client.on('registrationFailed', () => fired.push('registrationFailed'));
          client.on('error', () => fired.push('error'));

          client.connect().catch(() => resolve(fired));
        });
      },
      { server: SERVER },
    );

    expect(events).toContain('registrationFailed');
    expect(events.some((e) => e.startsWith('stateChanged:'))).toBe(true);
  });

  test('should fire disconnected event via stateChanged on disconnect', async ({ page }) => {
    const events = await page.evaluate(
      ({ server, username, password }) => {
        return new Promise<string[]>((resolve) => {
          const sdk = (window as any).JambonzSDK;
          const client = sdk.createJambonzClient({ server, username, password });
          (window as any).__client = client;

          client.connect().then(() => {
            const postEvents: string[] = [];
            client.on('stateChanged', (s: string) => postEvents.push(`stateChanged:${s}`));
            client.disconnect();
            setTimeout(() => resolve(postEvents), 1000);
          });
        });
      },
      { server: SERVER, username: USERNAME, password: PASSWORD },
    );

    expect(events).toContain('stateChanged:disconnected');
  });
});

test.describe('Call Events', () => {
  test('should fire stateChanged and failed/ended on hangup', async ({ page }) => {
    test.skip(!TARGET, 'Missing JAMBONZ_CALL_TARGET');

    const events = await page.evaluate(
      ({ server, username, password, target }) => {
        return new Promise<string[]>((resolve) => {
          const sdk = (window as any).JambonzSDK;
          const client = sdk.createJambonzClient({ server, username, password });
          (window as any).__client = client;

          client.connect().then(() => {
            const call = client.call(target);
            (window as any).__call = call;
            const fired: string[] = [];

            call.on('stateChanged', (s: string) => fired.push(`stateChanged:${s}`));
            call.on('progress', () => fired.push('progress'));
            call.on('accepted', () => fired.push('accepted'));
            call.on('ended', () => fired.push('ended'));
            call.on('failed', () => fired.push('failed'));
            call.on('mute', (m: boolean) => fired.push(`mute:${m}`));

            // Hangup after 2s
            setTimeout(() => call.hangup(), 2000);
            // Collect events after 4s
            setTimeout(() => resolve(fired), 4000);
          });
        });
      },
      { server: SERVER, username: USERNAME, password: PASSWORD, target: TARGET },
    );

    // Should have at least one stateChanged
    expect(events.some((e) => e.startsWith('stateChanged:'))).toBe(true);
    // Should have ended or failed
    expect(events.some((e) => e === 'ended' || e === 'failed')).toBe(true);
  });

  test('should fire mute events on mute/unmute', async ({ page }) => {
    test.skip(!TARGET, 'Missing JAMBONZ_CALL_TARGET');

    const events = await page.evaluate(
      ({ server, username, password, target }) => {
        return new Promise<string[]>((resolve) => {
          const sdk = (window as any).JambonzSDK;
          const client = sdk.createJambonzClient({ server, username, password });
          (window as any).__client = client;

          client.connect().then(() => {
            const call = client.call(target);
            (window as any).__call = call;
            const fired: string[] = [];

            call.on('mute', (m: boolean) => fired.push(`mute:${m}`));

            setTimeout(() => {
              call.mute();
              call.unmute();
            }, 1000);

            setTimeout(() => {
              call.hangup();
              resolve(fired);
            }, 3000);
          });
        });
      },
      { server: SERVER, username: USERNAME, password: PASSWORD, target: TARGET },
    );

    expect(events).toContain('mute:true');
    expect(events).toContain('mute:false');
  });
});
