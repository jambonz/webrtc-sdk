import { defineConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables from root .env.test
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

export default defineConfig({
  testDir: './tests',
  timeout: 60_000, // 60s per test — real SBC connections take time
  retries: 0,
  use: {
    // Real browser with WebRTC support
    browserName: 'chromium',
    // Allow microphone access for WebRTC
    permissions: ['microphone'],
    // Use fake audio device so tests work in CI (no real mic needed)
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-insecure-localhost',
      ],
    },
  },
  // Serve the test harness page via Vite
  webServer: {
    command: 'npx vite --config tests/vite.config.ts',
    port: 5199,
    reuseExistingServer: true,
  },
});
