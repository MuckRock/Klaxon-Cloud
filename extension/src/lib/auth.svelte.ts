export async function login() {
  console.log(`Logging in via ${import.meta.env.MUCKROCK_ACCOUNTS_HOST}`);
  console.log(`Client ID: ${import.meta.env.MUCKROCK_CLIENT_ID}`);
}
