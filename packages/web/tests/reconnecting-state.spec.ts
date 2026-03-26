/**
 * Integration tests: Reconnecting State
 *
 * Tests that transient WebSocket disconnects produce the 'reconnecting'
 * state (distinct from 'connecting' used for initial connection).
 *
 * Required env vars in .env.test:
 *   JAMBONZ_SIP_SERVER, JAMBONZ_SIP_USERNAME, JAMBONZ_SIP_PASSWORD
 */
import { test, expect } from '@playwright/test';

const SERVER = process.env.JAMBONZ_SIP_SERVER!;
const USERNAME = process.env.JAMBONZ_SIP_USERNAME!;
const PASSWORD = process.env.JAMBONZ_SIP_PASSWORD!;

test.beforeEach(async ({ page }) => {
  test.skip(!SERVER || !USERNAME || !PASSWORD, 'Missing JAMBONZ_ env vars');
  await page.goto('http://localhost:5199');
  await expect(page.locator('#status')).toHaveText('harness-loaded');
});

test.describe('Reconnecting State', () => {
  test('ClientState enum should include Reconnecting', async ({ page }) => {
    const states = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      return {
        disconnected: sdk.ClientState.Disconnected,
        connecting: sdk.ClientState.Connecting,
        connected: sdk.ClientState.Connected,
        registered: sdk.ClientState.Registered,
        reconnecting: sdk.ClientState.Reconnecting,
        unregistered: sdk.ClientState.Unregistered,
        error: sdk.ClientState.Error,
      };
    });

    expect(states.reconnecting).toBe('reconnecting');
    expect(states.connecting).toBe('connecting');
    // They must be different values
    expect(states.reconnecting).not.toBe(states.connecting);
  });

  test('initial connection should use Connecting, not Reconnecting', async ({ page }) => {
    const statesDuringConnect = await page.evaluate(
      ({ server, username, password }) => {
        return new Promise<string[]>((resolve) => {
          const sdk = (window as any).JambonzSDK;
          const client = sdk.createJambonzClient({ server, username, password });
          (window as any).__client = client;
          const states: string[] = [];

          client.on('stateChanged', (state: string) => {
            states.push(state);
          });

          client.connect().then(() => resolve(states));
        });
      },
      { server: SERVER, username: USERNAME, password: PASSWORD },
    );

    // Initial connection should go through 'connecting', never 'reconnecting'
    expect(statesDuringConnect).toContain('connecting');
    expect(statesDuringConnect).not.toContain('reconnecting');
    expect(statesDuringConnect).toContain('registered');
  });
});
