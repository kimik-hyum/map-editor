/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 에디터 postMessage 채널에서 허용할 부모 origin 목록(콤마 구분). 미설정 시 동일 origin만 허용.
  readonly VITE_EDITOR_PARENT_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
