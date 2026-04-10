ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --filter frontend... --no-frozen-lockfile

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
RUN corepack enable

ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ARG NEXT_INTERNAL_API_PROXY_TARGET=http://localhost:3001
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_INTERNAL_API_PROXY_TARGET=${NEXT_INTERNAL_API_PROXY_TARGET}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY frontend ./frontend

WORKDIR /app/frontend
RUN pnpm build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
RUN corepack enable

ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ARG NEXT_INTERNAL_API_PROXY_TARGET=http://localhost:3001
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_INTERNAL_API_PROXY_TARGET=${NEXT_INTERNAL_API_PROXY_TARGET}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/next.config.ts ./frontend/next.config.ts
COPY --from=builder /app/frontend/package.json ./frontend/package.json

WORKDIR /app/frontend

EXPOSE 3000

CMD ["pnpm", "start"]
