FROM node:24.14.0-alpine

WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run db:generate

EXPOSE 3000

CMD ["pnpm", "--filter", "@neet2work/backend", "dev"]
