FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
# Uploads live here; docker-compose mounts a volume on it so files survive restarts.
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["npm", "start"]
