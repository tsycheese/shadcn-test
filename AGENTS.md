# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` + Turborepo monorepo.

- `apps/web`: Next.js 16 app (App Router), API routes, UI pages, editor features, and tests.
- `apps/collaboration-server`: Yjs websocket collaboration service.
- `packages/ui`: Shared shadcn-based UI components (`src/components`) and style utilities.
- `packages/database`: Prisma schema, migrations, and shared DB client.
- `packages/eslint-config`, `packages/typescript-config`: shared lint/TS presets.
- `docs`: implementation notes and design plans.

## Build, Test, and Development Commands
Run from repo root unless noted:

- `pnpm dev`: start all workspace dev tasks via Turbo.
- `pnpm build`: build all packages/apps.
- `pnpm lint`: run ESLint across workspaces.
- `pnpm typecheck`: run TypeScript checks across workspaces.
- `pnpm format`: run Prettier tasks.
- `pnpm --filter web test`: run Vitest in `apps/web`.
- `pnpm --filter web test:e2e`: run Playwright E2E tests.
- `pnpm --filter @workspace/database db:migrate`: create/apply Prisma dev migration.

## Coding Style & Naming Conventions
- Formatting is enforced by Prettier (`.prettierrc`): 2 spaces, no semicolons, double quotes, trailing commas (`es5`), max width 80.
- Tailwind class ordering is handled by `prettier-plugin-tailwindcss`.
- Follow ESLint configs from shared presets (`@workspace/eslint-config`).
- Use clear file naming by role: React components in `kebab-case` (e.g. `invite-dialog.tsx`), route files follow Next.js conventions (`page.tsx`, `route.ts`).

## Testing Guidelines
- Unit/integration: Vitest + Testing Library (`apps/web/__tests__`).
- E2E: Playwright (`apps/web/playwright.config.ts`).
- Test files should match: `**/__tests__/**/*.{test,spec}.{ts,tsx}`.
- Run coverage with `pnpm --filter web test:coverage` (text/json/html reports). No hard coverage gate is currently configured.

## Commit & Pull Request Guidelines
- Use Conventional Commit style seen in history: `<type>(<scope>): <summary>`.
- Common types: `feat`, `fix`, `style`, `perf`, `docs`, `chore` (example: `feat(editor): 添加表格工具栏按钮`).
- Keep commits focused by feature/fix area.
- PRs should include: change summary, affected paths, test evidence (`pnpm lint`, relevant tests), linked issue, and UI screenshots/GIFs for visible frontend changes.

## Security & Configuration Tips
- Keep secrets in local `.env*` files; never commit credentials.
- Auth/email/database changes should be validated end-to-end before merge (register/login/reset-password/invite flows).
