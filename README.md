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
