FROM node:14

# set working directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# install and cache app dependencies
COPY package.json /usr/src/app/package.json
RUN yarn install --silent

COPY . .

RUN yarn generate

EXPOSE 1998

CMD ["yarn", "start"]