/**
 * Integration tests: SDK Options & Configuration
 *
 * Tests custom SIP headers, ICE configuration, User-Agent, version,
 * remote audio playback, and incoming call handling.
 *
 * Required env vars in .env.test:
 *   JAMBONZ_SIP_SERVER, JAMBONZ_SIP_USERNAME, JAMBONZ_SIP_PASSWORD, JAMBONZ_CALL_TARGET
 *   JAMBONZ_SIP_USERNAME_2, JAMBONZ_SIP_PASSWORD_2 (optional, for incoming call test)
 */
import { test, expect } from '@playwright/test';

const SERVER = process.env.JAMBONZ_SIP_SERVER!;
const USERNAME = process.env.JAMBONZ_SIP_USERNAME!;
const PASSWORD = process.env.JAMBONZ_SIP_PASSWORD!;
const TARGET = process.env.JAMBONZ_CALL_TARGET!;
const USERNAME_2 = process.env.JAMBONZ_SIP_USERNAME_2;
const PASSWORD_2 = process.env.JAMBONZ_SIP_PASSWORD_2;

test.beforeEach(async ({ page }) => {
  test.skip(!SERVER || !USERNAME || !PASSWORD, 'Missing JAMBONZ_ env vars');
  await page.goto('http://localhost:5199');
  await expect(page.locator('#status')).toHaveText('harness-loaded');
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    try { (window as any).__call?.hangup(); } catch {}
    try { (window as any).__client?.disconnect(); } catch {}
    try { (window as any).__client2?.disconnect(); } catch {}
  });
});

test.describe('VERSION & User-Agent', () => {
  test('should export VERSION string', async ({ page }) => {
    const version = await page.evaluate(() => (window as any).JambonzSDK.VERSION);

    expect(version).toBeTruthy();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('should export DEFAULT_USER_AGENT string', async ({ page }) => {
    const ua = await page.evaluate(() => (window as any).JambonzSDK.DEFAULT_USER_AGENT);

    expect(ua).toBeTruthy();
    expect(ua).toContain('jambonz-webrtc-');
  });

  test('should accept custom userAgent option', async ({ page }) => {
    // This test verifies the option is accepted without error
    const state = await page.evaluate(
      ({ server, username, password }) => {
        const sdk = (window as any).JambonzSDK;
        const client = sdk.createJambonzClient({
          server,
          username,
          password,
          userAgent: 'my-custom-app/1.0.0',
        });
        (window as any).__client = client;
        return client.connect().then(() => client.state);
      },
      { server: SERVER, username: USERNAME, password: PASSWORD },
    );

    expect(state).toBe('registered');
  });
});

test.describe('Custom SIP Headers', () => {
  test('should accept headers option on call() without error', async ({ page }) => {
    test.skip(!TARGET, 'Missing JAMBONZ_CALL_TARGET');

    const result = await page.evaluate(
      ({ server, username, password, target }) => {
        return new Promise<string>((resolve) => {
          const sdk = (window as any).JambonzSDK;
          const client = sdk.createJambonzClient({ server, username, password });
          (window as any).__client = client;

          client.connect().then(() => {
            try {
              const call = client.call(target, {
                headers: {
                  'X-Custom-Header': 'test-value',
                  'X-Account-Id': '12345',
                },
              });
              (window as any).__call = call;
              setTimeout(() => call.hangup(), 2000);
              resolve('ok');
            } catch (err: any) {
              resolve(`error: ${err.message}`);
            }
          });
        });
      },
      { server: SERVER, username: USERNAME, password: PASSWORD, target: TARGET },
    );

    expect(result).toBe('ok');
  });
});

test.describe('ICE Server Configuration', () => {
  test('should accept custom pcConfig on call()', async ({ page }) => {
    test.skip(!TARGET, 'Missing JAMBONZ_CALL_TARGET');

    const result = await page.evaluate(
      ({ server, username, password, target }) => {
        return new Promise<string>((resolve) => {
          const sdk = (window as any).JambonzSDK;
          const client = sdk.createJambonzClient({ server, username, password });
          (window as any).__client = client;

          client.connect().then(() => {
            try {
              const call = client.call(target, {
                pcConfig: {
                  iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                  ],
                },
              });
              (window as any).__call = call;
              setTimeout(() => call.hangup(), 2000);
              resolve('ok');
            } catch (err: any) {
              resolve(`error: ${err.message}`);
            }
          });
        });
      },
      { server: SERVER, username: USERNAME, password: PASSWORD, target: TARGET },
    );

    expect(result).toBe('ok');
  });
});

test.describe('Remote Audio Playback', () => {
  test('WebPlatformAdapter should create and manage audio element', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();

      // Before attach — no audio element
      const beforeCount = document.querySelectorAll('audio').length;

      // Create a dummy MediaStream
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const dest = ctx.createMediaStreamDestination();
      oscillator.connect(dest);
      const stream = dest.stream;

      // Attach
      adapter.attachRemoteStream(stream);
      const afterAttachCount = document.querySelectorAll('audio').length;

      // Detach
      adapter.detachRemoteStream();

      // Dispose
      adapter.dispose();
      const afterDisposeCount = document.querySelectorAll('audio').length;

      ctx.close();

      return { beforeCount, afterAttachCount, afterDisposeCount };
    });

    // Should create one audio element on attach
    expect(result.afterAttachCount).toBe(result.beforeCount + 1);
    // Should remove it on dispose
    expect(result.afterDisposeCount).toBe(result.beforeCount);
  });
});

test.describe('Incoming Call Handling', () => {
  test('should receive incoming call event when second client calls first', async ({ page }) => {
    test.skip(!USERNAME_2 || !PASSWORD_2, 'Missing JAMBONZ_SIP_USERNAME_2/PASSWORD_2');

    const result = await page.evaluate(
      ({ server, username, password, username2, password2 }) => {
        return new Promise<{ received: boolean; caller: string }>((resolve) => {
          const sdk = (window as any).JambonzSDK;

          // Register first client (callee)
          const client1 = sdk.createJambonzClient({
            server,
            username,
            password,
          });
          (window as any).__client = client1;

          client1.on('incoming', (call: any) => {
            resolve({ received: true, caller: call.remoteIdentity });
            call.hangup();
          });

          client1.connect().then(() => {
            // Register second client (caller) and call the first
            const client2 = sdk.createJambonzClient({
              server,
              username: username2,
              password: password2,
            });
            (window as any).__client2 = client2;

            client2.connect().then(() => {
              const call = client2.call(`sip:${username}@${new URL(server).hostname}`);
              (window as any).__call = call;
            });
          });

          // Timeout
          setTimeout(() => resolve({ received: false, caller: '' }), 15_000);
        });
      },
      {
        server: SERVER,
        username: USERNAME,
        password: PASSWORD,
        username2: USERNAME_2,
        password2: PASSWORD_2,
      },
    );

    expect(result.received).toBe(true);
    expect(result.caller).toBeTruthy();
  });
});
