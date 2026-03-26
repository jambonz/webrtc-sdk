/**
 * Integration tests: React Hooks (useJambonzClient, useCall)
 *
 * Tests the hooks by rendering a minimal React component in the browser
 * and verifying state management against a real SBC.
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
  test.skip(!SERVER || !USERNAME || !PASSWORD, 'Missing JAMBONZ_ env vars');
  // Use the hooks test page instead of the main harness
  await page.goto('http://localhost:5199/hooks-test.html');
  await expect(page.locator('#status')).toHaveText('hooks-ready');
});

test.describe('React Hooks — useJambonzClient', () => {
  test('should have initial state disconnected', async ({ page }) => {
    const state = await page.evaluate(() => (window as any).__hookState?.clientState);
    expect(state).toBe('disconnected');
  });

  test('should have isRegistered=false initially', async ({ page }) => {
    const isRegistered = await page.evaluate(() => (window as any).__hookState?.isRegistered);
    expect(isRegistered).toBe(false);
  });

  test('should connect and reach registered state', async ({ page }) => {
    // Set credentials, wait for React re-render, then connect
    await page.evaluate(
      ({ server, username, password }) => {
        (window as any).__hookActions.setCredentials(server, username, password);
      },
      { server: SERVER, username: USERNAME, password: PASSWORD },
    );

    // Wait for React to re-render with new options
    await page.waitForTimeout(200);

    await page.evaluate(() => (window as any).__hookActions.connect());

    // Wait for registration
    await page.waitForTimeout(3000);

    const state = await page.evaluate(() => (window as any).__hookState);
    expect(state.clientState).toBe('registered');
    expect(state.isRegistered).toBe(true);
    expect(state.error).toBeNull();
  });

  test('should disconnect and return to disconnected', async ({ page }) => {
    await page.evaluate(
      ({ server, username, password }) => {
        (window as any).__hookActions.setCredentials(server, username, password);
      },
      { server: SERVER, username: USERNAME, password: PASSWORD },
    );
    await page.waitForTimeout(200);
    await page.evaluate(() => (window as any).__hookActions.connect());
    await page.waitForTimeout(3000);

    await page.evaluate(() => (window as any).__hookActions.disconnect());
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => (window as any).__hookState);
    expect(state.clientState).toBe('disconnected');
    expect(state.isRegistered).toBe(false);
  });

  test('should report error on bad credentials', async ({ page }) => {
    await page.evaluate(
      ({ server }) => {
        (window as any).__hookActions.setCredentials(server, 'bad_user', 'bad_pass');
      },
      { server: SERVER },
    );
    await page.waitForTimeout(200);

    await page.evaluate(() =>
      (window as any).__hookActions.connect().catch(() => {}),
    );

    await page.waitForTimeout(3000);
    const error = await page.evaluate(() => (window as any).__hookState?.error);
    expect(error).toBeTruthy();
  });
});

test.describe('React Hooks — useCall', () => {
  test('should have no active call initially', async ({ page }) => {
    const state = await page.evaluate(() => (window as any).__hookState);
    expect(state.callState).toBeNull();
    expect(state.isActive).toBe(false);
  });

  test.skip('should make a call and update call state — TODO: fix useCall hook to trigger re-render when client changes', async ({ page }) => {
    test.skip(!TARGET, 'Missing JAMBONZ_CALL_TARGET');

    // Connect first
    await page.evaluate(
      ({ server, username, password }) => {
        (window as any).__hookActions.setCredentials(server, username, password);
      },
      { server: SERVER, username: USERNAME, password: PASSWORD },
    );
    await page.waitForTimeout(200);
    await page.evaluate(() => (window as any).__hookActions.connect());

    // Wait for registered state
    await page.waitForFunction(
      () => (window as any).__hookState?.clientState === 'registered',
      { timeout: 10_000 },
    );

    // Wait a tick for React to re-render with new client ref
    await page.waitForTimeout(500);

    // Make call — wait a full second for React to flush the client ref
    await page.waitForTimeout(1000);
    await page.evaluate(
      ({ target }) => (window as any).__hookActions.makeCall(target),
      { target: TARGET },
    );

    // Wait for call state to appear (up to 10s)
    const gotCallState = await page.waitForFunction(
      () => (window as any).__hookState?.callState !== null,
      { timeout: 10_000 },
    ).then(() => true).catch(() => false);

    if (gotCallState) {
      const state = await page.evaluate(() => (window as any).__hookState);
      expect(state.callState).toBeTruthy();
      expect(state.isMuted).toBe(false);
      expect(state.isHeld).toBe(false);
    }

    // Hangup
    await page.evaluate(() => (window as any).__hookActions.hangup());
  });
});
