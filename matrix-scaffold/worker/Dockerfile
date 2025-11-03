FROM node:18-alpine

# Install system deps required by sharp and puppeteer
RUN apk add --no-cache --virtual .build-deps python3 make g++ cairo-dev pango-dev libjpeg-turbo-dev libpng-dev giflib-dev

WORKDIR /work

# Copy backend package.json so we can install required dependencies
COPY ../backend/package.json ./backend/package.json

WORKDIR /work/backend
RUN npm ci --production

# Copy worker files
WORKDIR /work
COPY ./worker ./worker

ENV NODE_ENV=production

CMD ["node", "/work/worker/worker.js"]
