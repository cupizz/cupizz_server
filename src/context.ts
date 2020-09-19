import { PubSub } from 'apollo-server'
import { User, PrismaClient } from '@prisma/client'

export interface Context {
  prisma: PrismaClient
  pubsub: PubSub
  user?: User
}