FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.17.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN echo '#!/bin/sh' > /wait-for-backend.sh && \
    echo 'until nc -z backend 8000; do sleep 1; done' >> /wait-for-backend.sh && \
    echo 'exec nginx -g "daemon off;"' >> /wait-for-backend.sh && \
    chmod +x /wait-for-backend.sh

EXPOSE 80
CMD ["/wait-for-backend.sh"]
