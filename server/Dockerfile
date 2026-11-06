# Stage 1: compile the TypeScript (needs dev dependencies such as typescript).
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime image with production dependencies and the compiled output only.
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# Uploads live here; docker-compose mounts a volume on it so files survive restarts.
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["npm", "start"]
