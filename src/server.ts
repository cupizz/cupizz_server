import { PrismaClient } from '@prisma/client'
import { ApolloServer, PubSub } from 'apollo-server-express'
import express from 'express'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { Context } from './context'
import { schema } from './schema'
import { AuthService } from './service'
import { execute, subscribe } from 'graphql';
import bodyParser from 'body-parser';
import { createServer } from 'http'
import cors from 'cors';

const PORT = 1998;
const app = express();

app.use(cors({
  allowedHeaders: '*'
}));
app.use('/graphql', bodyParser.json());

export const pubsub = new PubSub();
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const createContext = async (token: string): Promise<Context> => {
  const user = await AuthService.verifyUser(token);
  return { prisma, pubsub, user }
}

const apolloServer = new ApolloServer({
  schema,
  uploads: true,
  context: (context): Promise<Context> => {
    const token = context.req?.header('authorization') || '';
    return createContext(token);
  },
})

apolloServer.applyMiddleware({ app });
const server = createServer(app);

server.listen(PORT, () => {
  new SubscriptionServer({
    execute,
    subscribe,
    schema: schema,
    onConnect: (header: any) => {
      return createContext(header.Authorization || header.authorization);
    }
  }, {
    server: server,
    path: '/graphql',
  });

  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`)
});