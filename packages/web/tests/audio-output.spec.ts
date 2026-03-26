/**
 * Integration tests: Audio Output Device Switching
 *
 * Tests the JambonzAudioManager.setOutputDevice() API and
 * WebPlatformAdapter.setOutputDevice() implementation.
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

test.describe('Audio Output Device Switching', () => {
  test('WebPlatformAdapter should have setOutputDevice method', async ({ page }) => {
    const hasMethod = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();
      return typeof adapter.setOutputDevice === 'function';
    });

    expect(hasMethod).toBe(true);
  });

  test('JambonzAudioManager.setOutputDevice should return boolean', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();
      const audioManager = new sdk.JambonzAudioManager(adapter);
      // setOutputDevice with 'default' should succeed (returns true)
      return audioManager.setOutputDevice('default');
    });

    // Should return true (web adapter supports setOutputDevice)
    expect(result).toBe(true);
  });

  test('JambonzAudioManager should enumerate speakers', async ({ page }) => {
    const speakers = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();
      const audioManager = new sdk.JambonzAudioManager(adapter);
      return audioManager.getSpeakers();
    });

    // Chromium with fake devices should have at least one output
    expect(Array.isArray(speakers)).toBe(true);
    // Each speaker should have the right shape
    for (const speaker of speakers) {
      expect(speaker).toHaveProperty('deviceId');
      expect(speaker).toHaveProperty('label');
      expect(speaker.kind).toBe('audiooutput');
    }
  });

  test('JambonzAudioManager should enumerate microphones', async ({ page }) => {
    const mics = await page.evaluate(() => {
      const sdk = (window as any).JambonzSDK;
      const adapter = new sdk.WebPlatformAdapter();
      const audioManager = new sdk.JambonzAudioManager(adapter);
      return audioManager.getMicrophones();
    });

    expect(Array.isArray(mics)).toBe(true);
    for (const mic of mics) {
      expect(mic).toHaveProperty('deviceId');
      expect(mic).toHaveProperty('label');
      expect(mic.kind).toBe('audioinput');
    }
  });
});
