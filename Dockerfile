FROM node:12

WORKDIR /cubizz

COPY package*.json ./

RUN yarn

COPY . .

RUN yarn generate

EXPOSE 1998

CMD ["yarn", "start"]