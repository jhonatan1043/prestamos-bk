FROM node:20-alpine AS builder
WORKDIR /app

# Instalar bash y dependencias necesarias para npm
RUN apk add --no-cache bash

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine
WORKDIR /app

# Instalar bash en la imagen runtime también (si tu entrypoint usa bash)
RUN apk add --no-cache bash

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000
CMD ["/usr/local/bin/entrypoint.sh"]