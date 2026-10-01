# syntax = docker/dockerfile:1

# Node 24 runs TypeScript's type-only syntax directly, so there's no build
# stage here: the image just needs production dependencies and the source.
FROM node:24-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:24-slim
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY app/ ./app/
COPY README.md ./

# Matches fly.toml's volume mount, so the SQLite file survives restarts and
# redeploys; CI's throwaway /data (see .github/workflows/checks.yml) just
# means that run's data doesn't persist, which is fine for a spec run.
ENV DATA_DIR=/data
ENV NODE_ENV=production

CMD ["node", "app/server.ts"]
