FROM node:22.14

WORKDIR /web

COPY package*.json ./

RUN rm -rf node_modules

RUN apt-get -y update && apt-get -y install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libtool automake

RUN npm install

COPY . .

EXPOSE 3000