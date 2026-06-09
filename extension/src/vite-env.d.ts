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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
