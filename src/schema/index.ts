import { makeSchema } from '@nexus/schema';
import { GraphQLDateTime } from 'graphql-iso-date';
import { nexusSchemaPrisma } from 'nexus-plugin-prisma/schema';
import path from 'path';
import { Context } from '../context';
import * as Mutation from './mutations';
import * as Query from './queries';
import * as Subscription from './subscriptions';
import * as Type from './types';

const nexusPrisma = nexusSchemaPrisma({
  experimentalCRUD: true,
  prismaClient: (ctx: Context) => ctx.prisma,
  scalars: {
    DateTime: GraphQLDateTime
  },
  paginationStrategy: 'prisma',
  computedInputs: {
    create: null
  },
  outputs: {
    typegen: path.join(__dirname, 'generated', 'index.ts'),
  }
})

export const schema = makeSchema({
  types: [Query, Type, Subscription, Mutation],
  plugins: [nexusPrisma],
  outputs: {
    schema: __dirname + '/generated/schema.graphql',
    typegen: __dirname + '/generated/nexus.ts',
  },
  typegenAutoConfig: {
    contextType: 'Context.Context',
    sources: [
      {
        source: '@prisma/client',
        alias: 'prisma',
      },
      {
        source: require.resolve('../context'),
        alias: 'Context',
      },
    ],
  },
})