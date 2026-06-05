#!/bin/bash
set -e

MONGO_DATA_DIR="/tmp/mongodb-data"
MONGO_LOG="/tmp/mongod.log"

mkdir -p "$MONGO_DATA_DIR"

if ! pgrep -x mongod > /dev/null; then
  echo "Starting MongoDB..."
  mongod --dbpath "$MONGO_DATA_DIR" --logpath "$MONGO_LOG" --fork --port 27017
  echo "MongoDB started."
else
  echo "MongoDB already running."
fi

echo "Waiting for MongoDB to be ready..."
for i in $(seq 1 30); do
  if node -e "
const net = require('net');
const s = net.createConnection(27017,'127.0.0.1');
s.on('connect',()=>{process.exit(0)});
s.on('error',()=>{process.exit(1)});
" 2>/dev/null; then
    echo "MongoDB is ready."
    break
  fi
  sleep 1
done

cd back-end
exec node src/server.js
