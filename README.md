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
import React, { useState } from "react";
import { useCreateTaslMutation } from "../generated/graphql-frontend";

interface Props {
  onSuccess: () => void;
}

const CreateTaskForm: React.FC<Props> = ({ onSuccess }) => {
  const [title, setTitle] = useState("");
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // onCompleted is called when the mutation is completed
  const [createTask, { loading, error }] = useCreateTaslMutation({
    onCompleted: () => {
      onSuccess();
      setTitle("");
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loading) {
      try {
        // variables are for inputing values through graphql
        await createTask({ variables: { input: { title } } });
      } catch (error) {
        // Log the error
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="alert-error">An error occurred.</p>}
      <input
        type="text"
        name="title"
        placeholder="What would you like to get done?"
        autoComplete="off"
        className="text-input new-task-text-input"
        value={title}
        onChange={handleTitleChange}
      />
    </form>
  );
};

export default CreateTaskForm;
```

### Form for updating tasks

#### To do that, we need firstly to create custom types and hooks:

- create a `task.graphql` file in graphql folder:

```ts
query Task($id: Int!) {
  task(id: $id) {
    id
    title
    status
  }
}
```

--> then run the codegen: `npm run codegen`

- Since fetching the data from server is asynchronous, we create a react component `[id].tsx` with a getServerSideProps function (type GetServerSideProps provided by NextJS):

```ts
import { GetServerSideProps } from "next";
import { initializeApollo } from "../../lib/client";
import {
  TaskQuery,
  TaskQueryVariables,
  TasksDocument,
} from "../../generated/graphql-frontend";
import { useRouter } from "next/router";
import Error from "next/error";
import { useTaskQuery } from "../../generated/graphql-frontend";
import UpdateTaskForm from "../../components/UpdateTaskForm";

const UpdateTask = () => {
  // to get the id inside of the component, we use Next useRouter
  const router = useRouter();
  const id =
    typeof router.query.id === "string" ? parseInt(router.query.id, 10) : NaN;
  if (!id) {
    return <Error statusCode={404} />;
  }
  const { data, loading, error } = useTaskQuery({ variables: { id } });
  const task = data?.task;
  return loading ? (
    <p>Loading...</p>
  ) : error ? (
    <p>An error occurred</p>
  ) : task ? (
    <UpdateTaskForm id={task.id} intialValues={{ title: task.title }} />
  ) : (
    <p>Task not found.</p>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id =
    typeof context.params?.id === "string"
      ? parseInt(context.params.id, 10)
      : NaN;
  if (id) {
    // inititalize the ApolloClient
    const apolloClient = initializeApollo();
    await apolloClient.query<TaskQuery, TaskQueryVariables>({
      query: TasksDocument,
      variables: { id },
    });
    return { props: { initalApolloState: apolloClient.cache.extract() } };
  }
  return { props: {} };
};

export default UpdateTask;
```

- and an UpdateTaskForm component:

```ts
import React, { useState } from "react";

interface Values {
  title: string;
}

interface Props {
  intialValues: Values;
}

const UpdateTaskForm: React.FC<Props> = ({ intialValues }) => {
  const [values, setValues] = useState<Values>(intialValues);
  const handlerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prevValues) => ({ ...prevValues, [name]: value }));
  };
  return (
    <form>
      <p>
        <label className="field-label">Title</label>
        <input
          type="text"
          name="title"
          className="text-input"
          value={values.title}
          onChange={handlerChange}
        />
      </p>
      <p>
        <button className="button" type="submit">
          Save
        </button>
      </p>
    </form>
  );
};

export default UpdateTaskForm;
```

#### Update the graphql backend for task updating

- Create update-task.graphql in graphql folder:

```ts
mutation UpdateTask($input: UpdateTaskInput!) {
  updateTask(input: $input) {
    id
    title
    status
  }
}
```

--> `npm run codegen`

- In the UpdateTaskForm component, add onSubmit handler:

```ts
...
// {loading, error is in result object}
  const [updateTask, { loading, error }] = useUpdateTaskMutation();

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const result = await updateTask({
        variables: { input: { id, title: values.title } },
      });
      if (result.data?.updateTask) {
        // redirect the router
        router.push("/");
      }
    } catch (error) {
      // Log the error.
    }
  };

   let errorMessage = "";
  if (error) {
    if (error.networkError) {
      errorMessage = "A network error occurred, please try again.";
    } else {
      //   console.log(error.graphQLErrors);
      errorMessage = "Sorry, an error occurred.";
    }
  }

  return (
    <form onSubmit={handleSubmit}>
    ...
    <button className="button" type="submit" disabled={loading}>
          {loading ? "Loading" : "Save"}
        </button>
    </form>
  )
```

### Delete tasks

#### Graphql type and hook generation

- Create delete-task.graphql

```ts
mutation DeleteTask($id: Int!) {
  deleteTask(id: $id) {
    id
    title
    status
  }
}
```

--> `npm run codegen`

#### Deleting a task

- Move task item from the map of TaskList component to a new TaskListItem component
- Implement deleteTask hook to each task:

```ts
import { Reference } from "@apollo/client";
import Link from "next/link";
import React, { useEffect } from "react";
import { Task, useDeleteTaskMutation } from "../generated/graphql-frontend";

interface Props {
  task: Task;
}

const TaskListItem: React.FC<Props> = ({ task }) => {
  const [deleteTask, { loading, error }] = useDeleteTaskMutation({
    variables: { id: task.id },
    errorPolicy: "all",
    update: (cache, result) => {
      const deletedTask = result.data?.deleteTask;

      if (deletedTask) {
        // console.log(cache.extract());
        cache.modify({
          // id: cache.identify(deletedTask),
          fields: {
            tasks(taskRefs: Reference[], { readField }) {
              return taskRefs.filter((taskRef) => {
                return readField("id", taskRef) !== deletedTask.id;
              });
            },
          },
        });
      }
    },
  });
  // error?.networkError;
  const handleDeleteClick = async () => {
    try {
      await deleteTask();
    } catch (error) {
      // Log the error
      console.log(error);
    }
  };

  useEffect(() => {
    if (error) {
      alert("An error occurred, please try again.");
    }
  }, [error]);

  return (
    <li key={task.id} className="task-list-item">
      <Link href="/update/[id]" as={`/update/${task.id}`}>
        <a className="task-list-item-title">{task.title}</a>
      </Link>
      <button
        className="task-list-item-delete"
        disabled={loading}
        onClick={handleDeleteClick}
      >
        &times;
      </button>
    </li>
  );
};

export default TaskListItem;
```

### Creating tasks filter component

- Create a dynamic page `[status].tsx` in the pages: move index.tsx page to [status].tsx page
- Since the index page also use the page in the [status].tsx, we export [status] as default in the index.tsx: `export { default } from './[status]';`
