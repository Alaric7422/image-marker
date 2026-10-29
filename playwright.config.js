import { defineConfig } from '@playwright/test';

const basePath = process.env.TEST_BASE_PATH || '/';
const serverUrl = `http://127.0.0.1:4173${basePath}`;

export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.js',
    use: {
        baseURL: serverUrl,
        headless: true,
        channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    },
    webServer: {
        command: `${process.env.TEST_PRODUCTION ? 'npm run preview' : 'npm run dev'} -- --host 127.0.0.1 --port 4173 --strictPort --base=${basePath}`,
        url: serverUrl,
        reuseExistingServer: false,
    },
});
