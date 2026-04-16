FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

RUN mkdir -p /uploads/images /uploads/files

EXPOSE 3000

CMD ["node", "src/server.js"]
