# Debian, not alpine: onnxruntime-node (used by the embedding model) ships glibc binaries only
FROM node:22-bookworm-slim

WORKDIR /usr/src/app

COPY package*.json ./
# CPU only: on linux/x64 onnxruntime-node otherwise tries to download its CUDA (GPU) binaries at install,
# and that download failed with 404 on the server. The model runs on CPU, so the GPU part is not needed.
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip
RUN npm install --omit=dev

COPY . .
# The model is baked into the image: no network needed at runtime, no download on the first request
RUN npm run download-model
