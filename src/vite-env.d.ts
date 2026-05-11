/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KITTEN_VOICE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
