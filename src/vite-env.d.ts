/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOCAL_DEV?: string;
  /**
   * Mock-mode demo admin password for test environments.
   * NOT a secret: every VITE_* value is embedded in the public JS bundle, and
   * mock mode has no server-side security. Never reuse a real password here.
   */
  readonly VITE_DEMO_ADMIN_PASSWORD?: string;
}
