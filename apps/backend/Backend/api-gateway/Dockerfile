# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER node

#EXPOSE 3000

CMD ["./entrypoint.sh", "node", "dist/main"]