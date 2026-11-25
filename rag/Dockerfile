# Debian, not alpine: onnxruntime-node (used by the embedding model) ships glibc binaries only
FROM node:22-bookworm-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
# The model is baked into the image: no network needed at runtime, no download on the first request
RUN npm run download-model
