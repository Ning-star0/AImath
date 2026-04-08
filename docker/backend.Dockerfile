ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
RUN pnpm install --filter backend... --no-frozen-lockfile

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY backend ./backend

WORKDIR /app/backend
RUN pnpm prisma generate
RUN pnpm build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
RUN corepack enable

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

WORKDIR /app/backend

EXPOSE 3001

CMD ["pnpm", "start:prod"]
