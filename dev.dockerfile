FROM node:12

COPY ./package.json /cubizz/package.json

WORKDIR /cubizz

USER root

RUN yarn install

COPY . .

RUN yarn generate

EXPOSE 1998

CMD ["yarn", "start"]