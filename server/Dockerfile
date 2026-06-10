FROM node:20-slim

RUN apt-get update && apt-get install -y sqlite3 ca-certificates && rm -rf /var/lib/apt/lists/*

# Litestream — continuous SQLite replication to S3/R2 (active when
# LITESTREAM_REPLICA_URL is set, see docker-entrypoint.sh)
COPY --from=litestream/litestream:0.3.13 /usr/local/bin/litestream /usr/local/bin/litestream

WORKDIR /app

# Node.js dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy application code
COPY src/ src/
COPY ml/tokenizer.js ml/tokenizer.js
COPY litestream.yml /etc/litestream.yml
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p /data

ENV DB_PATH=/data/chat.db
ENV PORT=8080

EXPOSE 8080

CMD ["./docker-entrypoint.sh"]
