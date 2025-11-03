FROM node:18-bullseye-slim

# Install system deps required by sharp and puppeteer. Using Debian-based
# image reduces native build issues for sharp and provides a Chromium binary
# compatible with Puppeteer in many CI runners.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		build-essential \
		python3 \
		ca-certificates \
		libvips-dev libvips-tools \
		libjpeg-dev \
		libpng-dev \
		wget \
		gnupg \
		fontconfig \
		fonts-liberation \
		libatk-bridge2.0-0 \
		libgtk-3-0 \
		libx11-6 \
		libx11-xcb1 \
		libxcb1 \
		libxcomposite1 \
		libxdamage1 \
		libxrandr2 \
		libgbm1 \
		libasound2 \
		libpangocairo-1.0-0 \
		libpango-1.0-0 \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /work

# Copy backend package.json so we can install required dependencies for the
# worker (worker relies on backend dependencies like puppeteer/sharp/jimp)
# Copy backend package files (package.json and package-lock.json if present)
COPY ../backend/package*.json ./backend/

WORKDIR /work/backend
# Use npm install instead of npm ci to avoid failing when package-lock.json
# isn't present in this context. Install production deps for the worker.
RUN npm install --production --no-audit --no-fund --no-progress

# Copy worker files
WORKDIR /work
COPY ./worker ./worker

ENV NODE_ENV=production

CMD ["node", "/work/worker/worker.js"]
