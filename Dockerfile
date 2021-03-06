FROM node:10-alpine as builder

USER root

RUN apk add git

COPY ./package.json ./package.json
RUN yarn install --silent

FROM node:10-alpine
WORKDIR /cupizz

COPY --from=builder /node_modules ./node_modules
COPY . .
ENV PATH ./node_modules/.bin:$PATH

RUN yarn generate

EXPOSE 1998
CMD ["yarn", "start"]