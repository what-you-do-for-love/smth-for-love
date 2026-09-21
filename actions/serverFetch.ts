import { Agent, fetch as undiciFetch } from 'undici';

// BE (.NET) dev chạy HTTPS với self-signed cert (dotnet dev-certs) → Node fetch
// mặc định reject. Trong môi trường dev hoặc khi bật cờ ALLOW_SELF_SIGNED_TLS,
// ta dùng undici dispatcher cho phép self-signed. KHÔNG bật ở production.
const allowInsecureTls =
  process.env.NODE_ENV === 'development' ||
  process.env.ALLOW_SELF_SIGNED_TLS === 'true';

const insecureAgent = allowInsecureTls
  ? new Agent({ connect: { rejectUnauthorized: false } })
  : undefined;

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

export const serverFetch = async (input: FetchInput, init?: FetchInit): Promise<Response> => {
  if (insecureAgent) {
    return (await undiciFetch(input as unknown as string, {
      ...(init as unknown as Record<string, unknown>),
      dispatcher: insecureAgent,
    })) as unknown as Response;
  }
  return fetch(input, init);
};
