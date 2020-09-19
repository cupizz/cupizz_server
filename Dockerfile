FROM node:12-alpine as builder

USER root

RUN apk add git

COPY ./package.json ./package.json
RUN yarn install --silent

FROM node:12-alpine
WORKDIR /cubizz

COPY --from=builder /node_modules ./node_modules
ENV PATH ./node_modules/.bin:$PATH

COPY . .

RUN npm run generate

EXPOSE 1998
CMD ["npm", "start"]