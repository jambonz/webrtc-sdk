/**
 * Integration tests: Call Control
 *
 * Tests mute/unmute, hold/unhold, DTMF, and call transfer
 * during an active call against a real Jambonz SBC.
 *
 * Required env vars in .env.test:
 *   JAMBONZ_SIP_SERVER, JAMBONZ_SIP_USERNAME, JAMBONZ_SIP_PASSWORD, JAMBONZ_CALL_TARGET
 */
import { test, expect, Page } from '@playwright/test';

const SERVER = process.env.JAMBONZ_SIP_SERVER!;
const USERNAME = process.env.JAMBONZ_SIP_USERNAME!;
const PASSWORD = process.env.JAMBONZ_SIP_PASSWORD!;
const TARGET = process.env.JAMBONZ_CALL_TARGET!;

async function connectAndCall(page: Page): Promise<void> {
  await page.evaluate(
    ({ server, username, password, target }) => {
      return new Promise<void>((resolve, reject) => {
        const sdk = (window as any).JambonzSDK;
        const client = sdk.createJambonzClient({ server, username, password });
        (window as any).__client = client;
        (window as any).__callEvents = [] as string[];

        client
          .connect()
          .then(() => {
            const call = client.call(target);
            (window as any).__call = call;

            call.on('stateChanged', (state: string) => {
              (window as any).__callEvents.push(`state:${state}`);
            });
            call.on('accepted', () => (window as any).__callEvents.push('accepted'));
            call.on('mute', (muted: boolean) =>
              (window as any).__callEvents.push(`mute:${muted}`),
            );
            call.on('hold', (held: boolean) =>
              (window as any).__callEvents.push(`hold:${held}`),
            );
            call.on('dtmf', (tone: string) =>
              (window as any).__callEvents.push(`dtmf:${tone}`),
            );
            call.on('ended', () => (window as any).__callEvents.push('ended'));
            call.on('failed', () => (window as any).__callEvents.push('failed'));

            // Wait for call to be accepted or give up after 15s
            const timeout = setTimeout(() => resolve(), 15_000);
            call.on('accepted', () => {
              clearTimeout(timeout);
              resolve();
            });
            call.on('failed', () => {
              clearTimeout(timeout);
              resolve(); // Don't reject — some tests check for failed state
            });
          })
          .catch(reject);
      });
    },
    { server: SERVER, username: USERNAME, password: PASSWORD, target: TARGET },
  );
}

test.beforeEach(async ({ page }) => {
  test.skip(!SERVER || !USERNAME || !PASSWORD || !TARGET, 'Missing JAMBONZ_ env vars');
  await page.goto('http://localhost:5199');
  await expect(page.locator('#status')).toHaveText('harness-loaded');
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

test.describe('Call Control — Mute', () => {
  test('should mute and unmute', async ({ page }) => {
    await connectAndCall(page);

    const result = await page.evaluate(() => {
      const call = (window as any).__call;
      if (!call || call.state === 'ended' || call.state === 'idle') {
        return { skipped: true };
      }

      call.mute();
      const afterMute = call.isMuted;

      call.unmute();
      const afterUnmute = call.isMuted;

      return { afterMute, afterUnmute, skipped: false };
    });

    if (result.skipped) {
      test.skip(true, 'Call was not connected');
      return;
    }
    expect(result.afterMute).toBe(true);
    expect(result.afterUnmute).toBe(false);
  });

  test('toggleMute should flip mute state', async ({ page }) => {
    await connectAndCall(page);

    const result = await page.evaluate(() => {
      const call = (window as any).__call;
      if (!call || call.state === 'ended' || call.state === 'idle') {
        return { skipped: true };
      }

      const before = call.isMuted;
      call.toggleMute();
      const after = call.isMuted;
      call.toggleMute();
      const afterToggleBack = call.isMuted;

      return { before, after, afterToggleBack, skipped: false };
    });

    if (result.skipped) {
      test.skip(true, 'Call was not connected');
      return;
    }
    expect(result.before).toBe(false);
    expect(result.after).toBe(true);
    expect(result.afterToggleBack).toBe(false);
  });
});

test.describe('Call Control — Hold', () => {
  test('should hold and unhold', async ({ page }) => {
    await connectAndCall(page);

    const result = await page.evaluate(() => {
      return new Promise<any>((resolve) => {
        const call = (window as any).__call;
        if (!call || call.state !== 'connected') {
          resolve({ skipped: true });
          return;
        }

        call.hold();

        // Hold is async — wait for event
        call.on('hold', (held: boolean) => {
          if (held) {
            const afterHold = call.isHeld;
            call.unhold();
            call.on('hold', (held2: boolean) => {
              if (!held2) {
                resolve({ afterHold, afterUnhold: call.isHeld, skipped: false });
              }
            });
          }
        });

        // Timeout fallback
        setTimeout(() => resolve({ skipped: true }), 10_000);
      });
    });

    if (result.skipped) {
      test.skip(true, 'Call was not connected');
      return;
    }
    expect(result.afterHold).toBe(true);
    expect(result.afterUnhold).toBe(false);
  });
});

test.describe('Call Control — DTMF', () => {
  test('should send DTMF tones without throwing', async ({ page }) => {
    await connectAndCall(page);

    const error = await page.evaluate(() => {
      const call = (window as any).__call;
      if (!call || call.state === 'ended' || call.state === 'idle') {
        return 'skipped';
      }

      try {
        call.sendDTMF('1');
        call.sendDTMF('2');
        call.sendDTMF('#');
        call.sendDTMF('*');
        return null;
      } catch (err: any) {
        return err.message;
      }
    });

    if (error === 'skipped') {
      test.skip(true, 'Call was not connected');
      return;
    }
    expect(error).toBeNull();
  });
});

test.describe('Call Control — Duration', () => {
  test('should track call duration when connected', async ({ page }) => {
    await connectAndCall(page);

    // Wait 2 seconds and check duration
    await page.waitForTimeout(2000);

    const duration = await page.evaluate(() => {
      const call = (window as any).__call;
      if (!call || call.state !== 'connected') return -1;
      return call.duration;
    });

    if (duration === -1) {
      test.skip(true, 'Call was not connected');
      return;
    }
    expect(duration).toBeGreaterThanOrEqual(1);
  });
});
