# course Project - task-mate with Next.js, docker, mysql and GraphQL

## Initialize a Next.js

- `npx create-next-app --use-npm`
- install typescript/react: `npm install --save-dev typescript @types/react @types/node@14`
- install apollo-server-micro: npm install -S apollo-server-micro

## Create a test sql schema

```sql
CREATE TABLE IF NOT EXISTS tasks(
    id INT UNSIGNED AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    task_status VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
)
```

## Docker

### Create a docker-compose (read more docker document)

```
version: "3.1"
services:
  mysql:
    image: mysql
    command: --default-authentication-plugin=mysql_native_password
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: myrootpassword
      MYSQL_USER: development
      MYSQL_PASSWORD: development
      MYSQL_DATABASE: task_mate
    ports:
      - 127.0.0.1:3307:3307
```

### Basic use with docker and sql:

- to create a container: `docker-compose up`
- to run container in the backgroud: `docker-compose up -d`
- to stop the container running in the background (not remove images): `docker-compse stop`
- to remove the container: `docker-compose down`
- name of the docker-container: `docker-compose ps`
- execute sql in docker (i for interactive): `docker exec -i name_of_mysql sh -c 'mysql -uroot -p"MYSQL_ROOT_PASSWORD" $MYSQL_DATABASE' < db/schema.sql`
  on Windows: `Get-Content db/schema.sql | docker exec -i CONTAINER_NAME sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" $MYSQL_DATABASE'`
  --> MYSQL_ROOT_PASSWORD and MYSQL_DATABASE are specified in docker-compose.yml or .env file; db/schema.sql is the targeted schema file.

## Serverless-mysql

- Install: `npm i -S serverless-mysql`
- add mysql to graphql.ts

```ts
import mysql from "serverless-mysql";
const db = mysql({
  config: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    database: process.env.MYSQL_DATABASE,
    password: process.env.MYSQL_PASSWORD,
  },
});
```

- connect to ApolloServer:

```ts
const apolloServer = new ApolloServer({ typeDefs, resolvers, context: { db } });

export default apolloServer.createHandler({ path: "/api/graphql" });
```

- to connect to sql in the console: `docker exec -it <containername> mysql -u<User> -h<Host> -p`

- using graphql (in graphql page):
  exp for create task:

```ts
mutation CreateTasl($input: CreateTaskInput!) {
  createTask(input: $input) {
    id
    title
    status
  }
}
```

query variable:

```ts
{
  "input": {
    "title": "My task #1"
  }
}
```

exp for task query:

```ts
query Tasks($status: TaskStatus) {
  tasks(status: $status) {
    id
    title
    status
  }
}
```

query variable (select all active tasks):

```ts
{
  "status": "active"
}
```

### Genarate graphql types for backend

- To generate the types for graphql schema, we can use: https://www.graphql-code-generator.com/

- install: `npm install --save graphql`
- install graphql cli: `npm install --save-dev @graphql-codegen/cli`
- intitialize graphql-codegen in our project: `npx graphql-codegen init` -> follow the instructions (not in this project we choose `Backend - API or server` for the type of graphql application, schema is in `http://localhost:3000/api/graphql`, the output file is `generated/graphql-backend.ts`)
- to run codegen: `npm run codegen` (after `npm install`)
- Create codegen.yml for backend:

```ts
overwrite: true
schema: "http://localhost:3000/api/graphql"
documents: graphql/**/*.graphql
generates:
  generated/graphql-backend.ts:
    plugins:
      - "typescript"
      - "typescript-resolvers"
    config:
      useIndexSignature: true
```

### Create the Apollo client to our full-stack app during server side rendering

- Move db, resolvers, schema and type-defs from pages/api/graphql.ts to the corresponding files in backend
- Create `lib/client.ts` file (copied and modified from https://github.com/vercel/next.js/blob/canary/examples/api-routes-apollo-server-and-client-auth/apollo/client.js):

```ts
import { useMemo } from "react";
import { ApolloClient, InMemoryCache } from "@apollo/client";
import merge from "deepmerge";

type MyApolloCache = any;

let apolloClient: ApolloClient<MyApolloCache> | undefined;

function createIsomorphLink() {
  if (typeof window === "undefined") {
    const { SchemaLink } = require("@apollo/client/link/schema");
    const { schema } = require("../backend/schema");
    const { db } = require("../backend/db");
    return new SchemaLink({ schema, context: { db } });
  } else {
    const { HttpLink } = require("@apollo/client/link/http");
    return new HttpLink({
      uri: "/api/graphql",
      credentials: "same-origin",
    });
  }
}

function createApolloClient() {
  return new ApolloClient({
    ssrMode: typeof window === "undefined",
    link: createIsomorphLink(),
    cache: new InMemoryCache(),
  });
}

export function initializeApollo(initialState: MyApolloCache | null = null) {
  const _apolloClient = apolloClient ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client, the initial state
  // get hydrated here
  if (initialState) {
    // Get existing cache, loaded during client side data fetching
    const existingCache = _apolloClient.extract();

    // Merge the existing cache into data passed from getStaticProps/getServerSideProps
    const data = merge(initialState, existingCache);

    // Restore the cache with the merged data
    _apolloClient.cache.restore(data);
  }
  // For SSG and SSR always create a new Apollo Client
  if (typeof window === "undefined") return _apolloClient;
  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient;

  return _apolloClient;
}

export function useApollo(initialState: MyApolloCache) {
  const store = useMemo(() => initializeApollo(initialState), [initialState]);
  return store;
}
```

--> The client will try to get the data directly from our resolvers and the schema that it gets from the file system.
--> In the browser, client will fetch the data using HttpLink ('/api/graphql')

- In the pages/index.tsx:

```ts
const TasksQueryDocument = gql`
  query Tasks {
    tasks {
      id
      title
      status
    }
  }
`;

interface TasksQuery {
  tasks: { id: number; title: string; status: string }[];
}

export default function Home() {
  const result = useQuery<TasksQuery>(TasksQueryDocument);
  // ? undefined or result.data
  const tasks = result.data?.tasks;

  return (
    <div className={styles.container}>
      <Head>
        <title>Tasks</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {tasks &&
        tasks.length > 0 &&
        tasks.map((task) => {
          return (
            <div key={task.id}>
              {task.title} ({task.status})
            </div>
          );
        })}
    </div>
  );
}

export const getStaticProps = async () => {
  const ApolloClient = initializeApollo();

  await ApolloClient.query<TasksQuery>({
    query: TasksQueryDocument,
  });

  return {
    props: {
      initialApolloState: ApolloClient.cache.extract(),
    },
  };
};
```

--> Create a getStaticProps to fetch the data before rendering. ApolloClient stores the fetched results in the cache and then we pass the cache to the page using initialApolloState props

- In the pages/\_app.tsx we create a custom apolloClient and pass the cache to the page components using ApolloProvider

```ts
function MyApp({ Component, pageProps }: AppProps) {
  const ApolloClient = useApollo(pageProps.initialApolloState);
  return (
    <ApolloProvider client={ApolloClient}>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}

export default MyApp;
```

### Graphql for for frontend

- add generation of graphql-front to the codegen.yml

```ts
...
generated/graphql-frontend.ts:
    plugins:
      - "typescript"
      - "typescript-operations"
      - "typescript-react-apollo" // this is for apollo custom types for react
```

--> install the plugins if needed (find plugin installation in: https://www.graphql-code-generator.com/docs/plugins/typescript): `npm i -D @graphql-codegen/typescript-operations` and `npm i -D @graphql-codegen/typescript-react-apollo`
--> re-run codegen to generate file and plugins: `npm run codegen` to get graphql types for frontend
--> read the generated types and hooks to frontend implementation

### Create new tasks

- Create a create-task.graphql in graphql folder

```ts
mutation CreateTasl($input: CreateTaskInput!) {
  createTask(input: $input) {
    id
    title
    status
  }
}
```

--> run codegen to generate types and custom react hooks (some hooks like `useCreateTaslMutation`): `npm run codegen`

- Create a CreateTaskFrom.tsx in components folder

```ts

```
