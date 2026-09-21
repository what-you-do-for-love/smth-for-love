# Smth For Love

A Next.js 16 application structured to mirror WarehouseFE. Backend: ASP.NET Core (Love project).

## Structure

```
src/
  app/         # Next.js app router pages
  api/         # API client (api, authApi, userApi, ...)
  components/  # Reusable components (AppShell, shared/*, ...)
  hooks/       # Custom React hooks
  lib/         # Utilities (ultis.ts, roles.ts, ...)
  types/       # TypeScript types
  middleware.ts
actions/
  serverFetch.ts
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Create `.env`:

```
NEXT_PUBLIC_API_HOST=https://localhost:7149
```
