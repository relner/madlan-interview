# Build stage: compile the Angular app
FROM node:22-alpine AS build

WORKDIR /usr/src/app/client

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Run stage: only the static files and a tiny static server
FROM node:22-alpine

WORKDIR /usr/src/app/client

RUN npm install -g serve@14

COPY --from=build /usr/src/app/client/dist/client/browser ./dist/browser
