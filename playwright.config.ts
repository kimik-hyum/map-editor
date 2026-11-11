import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:4174",
    // 재시도가 없어도 최초 실패의 원인을 확인할 수 있도록 기록을 보존합니다.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4174",
        env: {
          ...process.env,
          VITE_SUPABASE_URL: "http://127.0.0.1:4174/region-api",
          VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
          VITE_E2E_AUTH_BYPASS: "false",
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
