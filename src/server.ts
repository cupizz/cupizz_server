import { PrismaClient } from '@prisma/client'
import { ApolloServer, PubSub } from 'apollo-server-express'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { execute, subscribe } from 'graphql'
import { createServer } from 'http'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { Config, loadConfig } from './config'
import { Context } from './context'
import { runCronJob } from './cron'
import { schema } from './schema'
import { AuthService, UserService } from './service'
import { logger } from './utils/logger'

export const pubsub = new PubSub();
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'minimal',
});

async function main() {
  const PORT = 1998;
  const app = express();
  await loadConfig();
  
  process.setMaxListeners(0);
  app.use(cors({
    allowedHeaders: '*'
  }));
  app.use('/graphql', bodyParser.json());
  
  const createContext = async (token: string): Promise<Context> => {
    const user = await AuthService.verifyUser(token);
    return { prisma, pubsub, user }
  }
  
  const apolloServer = new ApolloServer({
    schema,
    uploads: {
      maxFileSize: 10000000,
      maxFiles: Config.maxFilesUpload
    },
    context: async (context): Promise<Context> => {
      const token = context.req?.header('authorization') || '';
      const result = await createContext(token);
  
      if (result.user) {
        await UserService.updateOnlineStatus(result.user);
      }
      return result;
    },
  })
  
  apolloServer.applyMiddleware({ app });
  const server = createServer(app);
  
  server.listen(PORT, () => {
    new SubscriptionServer({
      execute,
      subscribe,
      schema: schema,
      keepAlive: 1000,
      onConnect: async (header: any) => {
        const authorization = header.Authorization || header.authorization;
        const context = await createContext(authorization);
  
        if (context.user) {
          await UserService.updateOnlineStatus(context.user, 'online');
        }
  
        return context;
      },
      onDisconnect: async (_: any, initialContext: any) => {
        const context: Context = await initialContext.initPromise;
  
        if (context.user) {
          await UserService.updateOnlineStatus(context.user, 'offline');
        }
      }
    }, {
      server: server,
      path: '/graphql',
    });
  
    runCronJob();
    logger(`🚀 Server ready at http://localhost:${PORT}/graphql`)
  });
}

main();