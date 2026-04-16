#!/bin/bash
set -e

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — EDIT it before running in production!"
  exit 1
fi

docker compose up --build "$@"
