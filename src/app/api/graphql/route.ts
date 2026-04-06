import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { NextRequest, NextResponse } from 'next/server';
import { typeDefs } from '@/lib/server/graphql/schema';
import { resolvers } from '@/lib/server/graphql/resolvers';
import { auth } from '@/lib/auth';

const schema = makeExecutableSchema({ typeDefs, resolvers });
const server = new ApolloServer({ schema });
server.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

async function handleGraphQL(req: NextRequest) {
  const session = await auth();
  const user = session?.user
    ? { nodeId: session.user.nodeId, orgRole: session.user.orgRole }
    : undefined;

  const body = await req.json();

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
