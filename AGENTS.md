# AGENTS.md

## Commands
- `yarn dev` - Start development server (localhost:4321)
- `yarn build` - Build production site to ./dist/
- `yarn db:generate` - Generate Prisma client after schema changes
- `astro check` - TypeScript check
- No test framework configured

## Architecture
- **Stack**: Astro (static site generator) + Prisma (ORM) + PostgreSQL
- **Database**: PostgreSQL with Prisma ORM, generated client in `src/prisma/generated/`
- **API**: RESTful endpoints in `src/pages/api/` (e.g., `/api/map`)
- **Frontend**: Astro pages with TypeScript, custom CSS styling
- **Project**: Interactive canvas of iframe tiles, users can place iframes on a grid

## Code Style
- **Types**: Strict TypeScript, explicit interface definitions for API responses
- **Imports**: Use relative paths, import types with `type` keyword
- **Naming**: camelCase for variables/functions, PascalCase for interfaces/types
- **Database**: Access via Prisma client, prefer centralized prisma instance in `src/lib/prisma.ts`
- **API**: Use Astro APIRoute type, return JSON responses with `new Response(JSON.stringify())`
- **Config**: Constants in `src/config.ts`, environment variables via `import.meta.env`
- **Error handling**: Explicit error throwing with descriptive messages
- **Comments**: JSDoc for interfaces and complex functions
