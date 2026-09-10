import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const productionUrl = "https://wmfidaawutwavlwvqauh.supabase.co";
const publicVariables = new Set([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_EDITOR_PARENT_ORIGINS",
  "VITE_E2E_AUTH_BYPASS",
]);

function requireSafe(condition, message) {
  // AssertionError.actual에 잘못 입력한 비밀값이 남지 않게 고정 문구만 사용합니다.
  if (!condition) throw new Error(message);
}

function containsServiceRoleJwt(source) {
  for (const match of source.matchAll(
    /eyJ[A-Za-z0-9_-]*\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g,
  )) {
    try {
      if (
        JSON.parse(Buffer.from(match[1], "base64url").toString()).role ===
        "service_role"
      ) {
        return true;
      }
    } catch {
      // JWT가 아닌 SDK/문서 문자열은 무시합니다.
    }
  }
  return false;
}

export function validateProductionConfig(env) {
  const url = env.VITE_SUPABASE_URL;
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  requireSafe(
    url && publishableKey,
    "상용 빌드에 Supabase URL/public key가 필요합니다.",
  );
  requireSafe(
    url === productionUrl || url === `${productionUrl}/`,
    "상용 한국 Supabase 프로젝트 URL을 확인하세요.",
  );
  requireSafe(
    /^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publishableKey),
    "브라우저에는 실제 Supabase publishable key만 사용할 수 있습니다.",
  );
  requireSafe(
    !env.VITE_E2E_AUTH_BYPASS || env.VITE_E2E_AUTH_BYPASS === "false",
    "상용 인증 우회는 금지합니다.",
  );
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith("VITE_") && typeof value === "string") {
      requireSafe(
        publicVariables.has(name),
        "허용되지 않은 VITE 공개 변수가 있습니다.",
      );
      requireSafe(
        !/maps_dev_|sb_secret_/.test(value) && !containsServiceRoleJwt(value),
        "서버/개발 키를 공개 빌드에 넣을 수 없습니다.",
      );
    }
  }
  return { url, publishableKey };
}

export function validateProductionBundle(config, scripts) {
  // 예제 문서의 placeholder가 아니라 이번 빌드의 실제 두 값이 포함돼야 합니다.
  requireSafe(
    scripts.some(
      (source) => source.includes(config.url) && source.includes(config.publishableKey),
    ),
    "빌드한 JS에 실제 Supabase 설정이 없습니다. 환경 변수를 넣어 다시 빌드하세요.",
  );
  for (const source of scripts) {
    requireSafe(
      !/(?:maps_dev_[A-Za-z0-9_-]{43}|sb_secret_[A-Za-z0-9_-]{20,})/.test(source) &&
        !containsServiceRoleJwt(source),
      "공개 JS에 서버/개발 키가 있습니다.",
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const config = validateProductionConfig(loadEnv("production", root, "VITE_"));
  if (process.argv.includes("--built")) {
    const assets = resolve(root, "dist/assets");
    const files = (await readdir(assets)).filter((file) => file.endsWith(".js"));
    const scripts = await Promise.all(
      files.map((file) => readFile(resolve(assets, file), "utf8")),
    );
    validateProductionBundle(config, scripts);
  }
  console.log(
    `상용 Supabase ${process.argv.includes("--built") ? "빌드 산출물" : "환경 변수"} 검사 통과`,
  );
}
