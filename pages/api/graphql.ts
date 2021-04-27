import { ApolloServer } from "apollo-server-micro";
import mysql from "serverless-mysql";
import { schema } from "../../backend/schema";

const db = mysql({
  config: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    database: process.env.MYSQL_DATABASE,
    password: process.env.MYSQL_PASSWORD,
  },
});

const apolloServer = new ApolloServer({ schema, context: { db } });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default apolloServer.createHandler({ path: "/api/graphql" });
