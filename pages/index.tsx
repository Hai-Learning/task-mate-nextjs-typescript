import Head from "next/head";
import styles from "../styles/Home.module.css";
import { initializeApollo } from "../lib/client";
import {
  useTasksQuery,
  TasksQuery,
  TasksDocument,
} from "../generated/graphql-frontend";

export default function Home() {
  const result = useTasksQuery();
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
    query: TasksDocument,
  });

  return {
    props: {
      initialApolloState: ApolloClient.cache.extract(),
    },
  };
};
