# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js App Router pages, layouts, and API routes such as `app/api/analyses/route.ts`. Reusable UI lives in `components/`, with dashboard-specific widgets under `components/dashboard/`. Core calculation and parsing logic belongs in `lib/`, while database access and Drizzle schema files are in `lib/db/`. Shared TypeScript types live in `types/`, static assets in `public/`, and SQL migrations plus Drizzle metadata in `drizzle/`.

## Build, Test, and Development Commands
Use `npm install` to install dependencies. Run `npm run dev` for local development, `npm run build` to produce a production build, `npm run start` to serve that build, and `npm run lint` to run ESLint across `.js`, `.jsx`, `.ts`, and `.tsx` files. Example: `npm run lint` before opening a PR.

## Coding Style & Naming Conventions
This repo uses TypeScript with `strict` mode enabled and the `@/*` path alias from `tsconfig.json`. Follow the existing style: 2-space indentation, semicolons, single quotes, and trailing commas where the formatter leaves them. Name React components and component files in PascalCase, utility modules in camelCase, and route folders with Next.js conventions such as `app/history/[id]/page.tsx`. Keep business logic in `lib/` rather than embedding it in page components.

## Testing Guidelines
There is no automated test suite configured yet in `package.json`. For now, treat `npm run lint` as the required baseline check and manually verify the main flows in `app/page.tsx`, history pages, and relevant API routes. When adding tests later, place them beside the feature or in a dedicated `__tests__/` folder and use `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
Recent history shows short, imperative commits such as `update profile` and `adding`. Keep messages concise but more specific than that when possible, for example `add ASCVD fallback for missing lipids`. PRs should include a short summary, impacted routes or components, environment or schema changes, and screenshots for UI updates.

## Security & Configuration Tips
Keep secrets in environment variables. `DATABASE_URL` is required for Drizzle and Neon database access, and Clerk auth keys must be configured before testing sign-in flows. Do not commit `.env` files or real patient data.
