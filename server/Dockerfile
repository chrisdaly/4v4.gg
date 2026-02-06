FROM node:20-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY src/ src/

RUN mkdir -p /data

ENV DB_PATH=/data/chat.db
ENV PORT=8080

EXPOSE 8080

CMD ["node", "src/index.js"]
