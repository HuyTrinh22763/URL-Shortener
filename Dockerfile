FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY backend ./backend
COPY frontend ./frontend
CMD ["node", "backend/server.js"]
