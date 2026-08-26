import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4174",
    env: {
      ...process.env,
      VITE_SUPABASE_URL: "http://127.0.0.1:4174/region-api",
      VITE_SUPABASE_ANON_KEY: "test-publishable-key",
      // 실제 opener navigation E2E를 위해 두 로컬 origin을 명시적으로 허용합니다.
      VITE_EDITOR_PARENT_ORIGINS: "http://127.0.0.1:4174,http://localhost:4174",
    },
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:4174",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
