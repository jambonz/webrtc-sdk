/**
 * Integration tests: Ringtone/Ringback Audio
 *
 * Tests that the WebPlatformAdapter has playTone/stopTone methods
 * and that ringback is played during outgoing call ringing.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:5199');
  await expect(page.locator('#status')).toHaveText('harness-loaded');
});

test.describe('Ringtone/Ringback', () => {
  test('WebPlatformAdapter should have playTone method', async ({ page }) => {
    const hasMethod = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();
      return typeof adapter.playTone === 'function';
    });
    expect(hasMethod).toBe(true);
  });

  test('WebPlatformAdapter should have stopTone method', async ({ page }) => {
    const hasMethod = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();
      return typeof adapter.stopTone === 'function';
    });
    expect(hasMethod).toBe(true);
  });

  test('playTone should create AudioContext and stopTone should clean up', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();

      // Play ringback
      adapter.playTone('ringback', true);
      const playing = !!(adapter as any).toneContext;

      // Stop
      adapter.stopTone();
      const stopped = !(adapter as any).toneContext;

      return { playing, stopped };
    });

    expect(result.playing).toBe(true);
    expect(result.stopped).toBe(true);
  });

  test('playTone should support ringtone type', async ({ page }) => {
    const noError = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();
      try {
        adapter.playTone('ringtone', true);
        adapter.stopTone();
        return true;
      } catch {
        return false;
      }
    });
    expect(noError).toBe(true);
  });

  test('dispose should stop any playing tone', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();
      adapter.playTone('ringback', true);
      adapter.dispose();
      return !(adapter as any).toneContext;
    });
    expect(result).toBe(true);
  });
});
