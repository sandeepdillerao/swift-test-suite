# syntax=docker/dockerfile:1.6
# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
# Lockfile may be out of sync with package.json; use install (not ci) for resilience
RUN npm install --no-audit --no-fund

COPY . .

# Build-time API base (relative -> nginx will proxy /api to backend service)
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---------- Stage 2: nginx serve ----------
FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
