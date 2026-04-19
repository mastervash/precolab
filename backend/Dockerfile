FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

RUN mkdir -p /uploads/images /uploads/files

EXPOSE 3000

CMD ["node", "src/server.js"]
