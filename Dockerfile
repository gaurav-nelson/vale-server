# Stage 1: Build stage
FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev

COPY . ./

FROM alpine:3.20

RUN echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >>/etc/apk/repositories

# gem install uri is a vulnerability fix
RUN apk update && \
    apk upgrade && \
    apk add --no-cache vale nodejs && \
    rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

COPY --from=build /usr/src/app /usr/src/app

ENV ADDRESS=0.0.0.0 PORT=3000

CMD [ "node", "index.js" ]
