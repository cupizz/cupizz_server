FROM node:14-alpine as builder

USER root

RUN apk add git

COPY ./package.json ./package.json
RUN yarn install --silent

FROM node:14-alpine
WORKDIR /cubizz

COPY --from=builder /node_modules ./node_modules
COPY . .
ENV PATH ./node_modules/.bin:$PATH

RUN yarn generate

EXPOSE 1998
CMD ["yarn", "start"]