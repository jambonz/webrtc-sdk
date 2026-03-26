/**
 * Integration tests: Connection Lifecycle
 *
 * Tests SIP registration, state transitions, disconnect, and reconnection
 * against a real Jambonz SBC.
 *
 * Required env vars in .env.test:
 *   JAMBONZ_SIP_SERVER, JAMBONZ_SIP_USERNAME, JAMBONZ_SIP_PASSWORD
 */
import { test, expect, Page } from '@playwright/test';

const SERVER = process.env.JAMBONZ_SIP_SERVER!;
const USERNAME = process.env.JAMBONZ_SIP_USERNAME!;
const PASSWORD = process.env.JAMBONZ_SIP_PASSWORD!;

test.beforeEach(async ({ page }) => {
  test.skip(!SERVER || !USERNAME || !PASSWORD, 'Missing JAMBONZ_ env vars');
  await page.goto('http://localhost:5199');
  await expect(page.locator('#status')).toHaveText('harness-loaded');
});

async function connect(page: Page) {
  return page.evaluate(
    ({ server, username, password }) => {
      return new Promise<string>((resolve, reject) => {
        const sdk = (window as any).JambonzSDK;
        const client = sdk.createJambonzClient({ server, username, password });
        (window as any).__client = client;
        (window as any).__events = [];

        client.on('stateChanged', (state: string) => {
          (window as any).__events.push(`state:${state}`);
        });
        client.on('registered', () => (window as any).__events.push('registered'));
        client.on('connected', () => (window as any).__events.push('connected'));
        client.on('disconnected', () => (window as any).__events.push('disconnected'));
        client.on('error', (err: Error) => (window as any).__events.push(`error:${err.message}`));

        client
          .connect()
          .then(() => resolve(client.state))
          .catch((err: Error) => reject(err.message));
      });
    },
    { server: SERVER, username: USERNAME, password: PASSWORD },
  );
}

test.describe('Connection Lifecycle', () => {
  test('should connect and register with the SBC', async ({ page }) => {
    const finalState = await connect(page);
    expect(finalState).toBe('registered');

    const events = await page.evaluate(() => (window as any).__events);
    expect(events).toContain('state:connecting');
    expect(events).toContain('state:connected');
    expect(events).toContain('state:registered');
    expect(events).toContain('connected');
    expect(events).toContain('registered');
  });

  test('should report isRegistered=true after connect', async ({ page }) => {
    await connect(page);
    const isRegistered = await page.evaluate(() => (window as any).__client.isRegistered);
    expect(isRegistered).toBe(true);
  });

  test('should disconnect cleanly', async ({ page }) => {
    await connect(page);

    const state = await page.evaluate(() => {
      const client = (window as any).__client;
      client.disconnect();
      return client.state;
    });

    expect(state).toBe('disconnected');
  });

  test('should transition to disconnected and emit event on disconnect', async ({ page }) => {
    await connect(page);

    await page.evaluate(() => {
      (window as any).__events = [];
      const client = (window as any).__client;
      client.disconnect();
    });

    // Wait for disconnect event to propagate
    await page.waitForTimeout(1000);

    const events = await page.evaluate(() => (window as any).__events);
    expect(events).toContain('state:disconnected');
  });

  test('should throw if connect() called twice', async ({ page }) => {
    await connect(page);

    const error = await page.evaluate(() => {
      const client = (window as any).__client;
      return client
        .connect()
        .then(() => null)
        .catch((err: Error) => err.message);
    });

    expect(error).toContain('Already connected');
  });

  test('should reject with RegistrationError on bad credentials', async ({ page }) => {
    const error = await page.evaluate(
      ({ server }) => {
        const sdk = (window as any).JambonzSDK;
        const client = sdk.createJambonzClient({
          server,
          username: 'invalid_user_xyz',
          password: 'wrong_password',
        });
        return client
          .connect()
          .then(() => null)
          .catch((err: Error) => err.message);
      },
      { server: SERVER },
    );

    expect(error).toBeTruthy();
  });
});
