/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_MODE?: "http" | "fixtures";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
