import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { typeDefs } from '@/lib/server/graphql/schema';
import { resolvers } from '@/lib/server/graphql/resolvers';
import { config } from '@/lib/server/config';

const schema = makeExecutableSchema({ typeDefs, resolvers });
const server = new ApolloServer({ schema });
server.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

function extractUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      return jwt.verify(authHeader.slice(7), config.API_JWT_SECRET);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

async function handleGraphQL(req: NextRequest) {
  const body = await req.json();
  const user = extractUser(req);

  const response = await server.executeOperation(
    {
      query: body.query,
      variables: body.variables,
      operationName: body.operationName,
    },
    { contextValue: { user } }
  );

  if (response.body.kind === 'single') {
    return NextResponse.json(response.body.singleResult);
  }

  return NextResponse.json({ errors: [{ message: 'Unexpected response' }] });
}

export async function GET(req: NextRequest) {
  return handleGraphQL(req);
}

export async function POST(req: NextRequest) {
  return handleGraphQL(req);
}
