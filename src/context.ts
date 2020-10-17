 
import { PrismaClient, Role, User } from '@prisma/client'
import { PubSub } from 'apollo-server-express'

export interface Context {
  prisma: PrismaClient
  pubsub: PubSub
  user?: User & { role: Role },
  token?: string,
  hostUrl: string,
}