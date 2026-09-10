/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  // 로컬 Playwright 개발 서버에서만 활성화됩니다. 프로덕션 빌드에서는 항상 무시됩니다.
  readonly VITE_E2E_AUTH_BYPASS?: string;
  // 에디터 postMessage 채널에서 허용할 부모 origin 목록(콤마 구분).
  // 미설정 또는 "*"는 모든 HTTPS origin과 로컬 개발용 동일 origin을 허용합니다.
  readonly VITE_EDITOR_PARENT_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
