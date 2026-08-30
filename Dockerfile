FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY app/package.json app/package-lock.json* ./
RUN npm install

COPY app/ ./
RUN npm run build

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY app/package.json app/package-lock.json* ./
RUN npm install --omit=dev

COPY app/src/server ./src/server
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/data/uploads

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV UPLOADS_DIR=/app/data/uploads

EXPOSE 3000

CMD ["node", "src/server/index.js"]
