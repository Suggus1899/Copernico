# Imagen de producción de la API (Express). El cliente se despliega aparte (Vercel).
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
RUN pnpm run build && pnpm prune --prod

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- "http://127.0.0.1:${PORT:-4002}/api/health/ready" > /dev/null || exit 1
CMD ["node", "dist/src/index.js"]
