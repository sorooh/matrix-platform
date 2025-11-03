FROM node:18-alpine
WORKDIR /app
COPY backend/package.json backend/tsconfig.json ./
COPY backend/src ./src
RUN npm install --prefix ./ && npm run build --prefix ./ || true
EXPOSE 3000
CMD ["node", "./src/main.js"]
