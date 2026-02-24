FROM node:20-slim

WORKDIR /app

# Node.js dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy application code
COPY src/ src/
COPY ml/tokenizer.js ml/tokenizer.js

RUN mkdir -p /data

ENV DB_PATH=/data/chat.db
ENV PORT=8080

EXPOSE 8080

CMD ["node", "src/index.js"]
