interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly MUCKROCK_DOCUMENTCLOUD_API: string;
  readonly MUCKROCK_KLAXON_ID: string;
  readonly MUCKROCK_ACCOUNTS_HOST: string;
  readonly MUCKROCK_CLIENT_ID: string;
  readonly MUCKROCK_SCOPES: string;
  readonly MUCKROCK_ENVIRONMENT?: string;
  readonly MUCKROCK_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Firefox-only sidebarAction API. @types/chrome (Chrome-only) doesn't declare
// it, but the manifest's `sidebar_action` key makes it available at runtime in
// Firefox. We only call toggle(); declare just that, behind optional chaining.
declare namespace chrome {
  const sidebarAction:
    | {
        toggle(): Promise<void>;
      }
    | undefined;
}
