FROM node:12

WORKDIR /app

ADD package.json .

ADD package-lock.json .

RUN npm install

COPY . .


CMD ["node", "server"]