/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional — both default to localhost / window.location-derived values.
  // See src/lib/env.ts for the runtime fallbacks.
  readonly VITE_API_URL?: string;
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
