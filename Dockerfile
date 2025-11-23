### Stage 1: Build client (Vite)
FROM node:18 AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

### Stage 2: Install backend production deps
FROM node:18 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

### Stage 3: Final image
FROM node:18-alpine
WORKDIR /app

# copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# copy backend source
COPY . .

# copy built client into server's expected folder
COPY --from=client-builder /app/client/dist ./client/dist

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]
