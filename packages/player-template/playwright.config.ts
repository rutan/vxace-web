import net from 'node:net';
import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const testPort = externalBaseURL ? null : await resolveTestPort();
const baseURL = externalBaseURL ?? `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: './tests/browser',
  workers: 4,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: 'test-results/playwright',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: {
      width: 1280,
      height: 900,
    },
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `pnpm exec vite --host 127.0.0.1 --port ${testPort} --strictPort`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});

function getFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();

    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port);
        } else {
          reject(new Error('failed to allocate browser test port'));
        }
      });
    });
  });
}

async function resolveTestPort() {
  const configuredPort = process.env.PLAYWRIGHT_TEST_PORT;
  if (configuredPort) {
    return Number(configuredPort);
  }

  const port = await getFreePort();
  process.env.PLAYWRIGHT_TEST_PORT = String(port);
  return port;
}
