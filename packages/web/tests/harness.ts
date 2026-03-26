/**
 * Test harness — exposes the SDK to the browser window so Playwright
 * tests can call SDK methods and inspect state via page.evaluate().
 */
import {
  createJambonzClient,
  JambonzClient,
  JambonzCall,
  JambonzAudioManager,
  CallState,
  ClientState,
  WebPlatformAdapter,
  VERSION,
  DEFAULT_USER_AGENT,
} from '@jambonz/client-sdk-web';

// Expose to window for Playwright
(window as any).JambonzSDK = {
  createJambonzClient,
  CallState,
  ClientState,
  WebPlatformAdapter,
  JambonzAudioManager,
  VERSION,
  DEFAULT_USER_AGENT,
};

// Store active instances for test access
(window as any).__client = null as JambonzClient | null;
(window as any).__call = null as JambonzCall | null;
(window as any).__events = [] as string[];
(window as any).__audioManager = null as JambonzAudioManager | null;

document.getElementById('status')!.textContent = 'harness-loaded';
