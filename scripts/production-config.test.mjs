import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  validateProductionBundle,
  validateProductionConfig,
} from "./verify-production-config.mjs";

const env = {
  VITE_SUPABASE_URL: "https://wmfidaawutwavlwvqauh.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"a".repeat(32)}`,
};

test("상용 Supabase 공개 설정을 허용한다", () => {
  assert.equal(validateProductionConfig(env).url, env.VITE_SUPABASE_URL);
});
test("전체 또는 한쪽 설정이 없으면 빌드 전에 거절한다", () => {
  for (const candidate of [
    {},
    { ...env, VITE_SUPABASE_URL: "" },
    { ...env, VITE_SUPABASE_PUBLISHABLE_KEY: "" },
  ]) {
    assert.throws(() => validateProductionConfig(candidate));
  }
});
test("localhost와 예제 URL/key를 거절한다", () => {
  for (const url of [
    "http://localhost:4174",
    "https://your-project.supabase.co",
    "https://example.com",
    `https://${"a".repeat(20)}.supabase.co`,
  ]) {
    assert.throws(() => validateProductionConfig({ ...env, VITE_SUPABASE_URL: url }));
  }
  assert.throws(() =>
    validateProductionConfig({
      ...env,
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_your_key",
    }),
  );
});

test("오류 객체나 stack에 거절한 비밀값을 남기지 않는다", () => {
  const secret = `sb_secret_${"synthetic".repeat(4)}`;
  assert.throws(
    () => validateProductionConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: secret }),
    (error) => !inspect(error).includes(secret) && !error.stack.includes(secret),
  );
});

test("명시하지 않은 공개 환경 변수와 구 인증 변수는 거절한다", () => {
  for (const name of ["VITE_GOOGLE_CLIENT_SECRET", "VITE_SUPABASE_ANON_KEY"]) {
    assert.throws(() =>
      validateProductionConfig({ ...env, [name]: "synthetic-value" }),
    );
  }
  validateProductionConfig({
    ...env,
    VITE_EDITOR_PARENT_ORIGINS: "https://maps-editor.pages.dev",
    VITE_E2E_AUTH_BYPASS: "false",
  });
});

test("구 service-role JWT도 공개 환경 변수와 번들에서 거절한다", () => {
  const jwt = [
    Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url"),
    Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url"),
    "synthetic-signature",
  ].join(".");
  assert.throws(() =>
    validateProductionConfig({ ...env, VITE_EDITOR_PARENT_ORIGINS: jwt }),
  );
  const config = validateProductionConfig(env);
  assert.throws(() => validateProductionBundle(config, [JSON.stringify(config), jwt]));
});
test("비밀 키와 개발 키, 인증 우회를 거절한다", () => {
  for (const key of [
    `sb_secret_${"a".repeat(32)}`,
    `maps_dev_${"a".repeat(43)}`,
    "eyJhbGciOiJIUzI1NiJ9.secret.signature",
  ]) {
    assert.throws(() =>
      validateProductionConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: key }),
    );
  }
  assert.throws(() =>
    validateProductionConfig({ ...env, VITE_OTHER_KEY: `maps_dev_${"a".repeat(43)}` }),
  );
  assert.throws(() =>
    validateProductionConfig({ ...env, VITE_E2E_AUTH_BYPASS: "true" }),
  );
});
test("환경 변수만 있어도 기존 잘못된 빌드의 업로드를 허용하지 않는다", () => {
  const config = validateProductionConfig(env);
  for (const scripts of [
    [],
    ["throw new Error('Supabase 설정이 없습니다.')"],
    [config.url],
    [config.publishableKey],
  ]) {
    assert.throws(() => validateProductionBundle(config, scripts));
  }
  validateProductionBundle(config, [JSON.stringify(config)]);
  // Supabase SDK 자체의 key-prefix 판별 문자열은 실제 비밀 키가 아닙니다.
  validateProductionBundle(config, [
    JSON.stringify(config),
    'key.startsWith("sb_secret_")',
  ]);
});
test("별도 JS 조각에 유출된 개발 키도 거절한다", () => {
  const config = validateProductionConfig(env);
  assert.throws(() =>
    validateProductionBundle(config, [
      JSON.stringify(config),
      `maps_dev_${"a".repeat(43)}`,
    ]),
  );
});
