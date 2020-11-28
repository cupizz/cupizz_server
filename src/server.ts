import { PrismaClient } from '@prisma/client'
import { ApolloServer, PubSub } from 'apollo-server-express'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { execute, subscribe } from 'graphql'
import { createServer } from 'http'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { Config, ConstConfig, loadConfig } from './config'
import { Context } from './context'
import { runCronJob } from './cron'
import { DefaultRole } from './model/role'
import { schema } from './schema'
import { AuthService, UserService } from './service'
import { logger } from './utils/logger'

export const pubsub = new PubSub();
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'minimal'
});

async function main() {
  const PORT = ConstConfig.port;
  const app = express();
  await loadConfig();

  process.setMaxListeners(0);
  app.use(cors({
    allowedHeaders: '*'
  }));

  app.use('/graphql', bodyParser.json());

  const createContext = async (token: string, hostUrl: string): Promise<Context> => {
    const user = await AuthService.verifyUser(token);
    if (user) {
      await UserService.validateValidAccount(user);
    }
    return { prisma, pubsub, user, token, hostUrl }
  }

  const apolloServer = new ApolloServer({
    schema,
    uploads: {
      maxFileSize: 10000000,
      maxFiles: Config.maxFilesUpload.value || 10
    },
    formatError: (error) => ({
      ...error,
      message: error.message?.replace('Context creation failed: ', '')
    }),
    context: async (context): Promise<Context> => {
      const token = context.req?.header('authorization') || '';
      const hostUrl = context.req.protocol + '://' + context.req.get('host')
      const result = await createContext(token, hostUrl);

      if (result.user) {
        await UserService.updateOnlineStatus(result.user);
      }
      return result;
    },
  })

  apolloServer.applyMiddleware({ app });
  app.use('/assets', express.static('assets'));
  const server = createServer(app);

  server.listen(PORT, async () => {
    new SubscriptionServer({
      execute,
      subscribe,
      schema: schema,
      keepAlive: 1000,
      onConnect: async (header: any, ctx: any) => {
        const authorization = header.Authorization || header.authorization;
        const context = await createContext(authorization, ctx.upgradeReq.headers.origin);

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
    logger(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    try {
      await prisma.role.update({
        where: { id: DefaultRole.admin.id },
        data: {
          ...DefaultRole.admin,
          permissions: { set: DefaultRole.admin.permissions }
        }
      })
      logger('Updated ADMIN role')
    } catch (_) { };
  });
}

main();