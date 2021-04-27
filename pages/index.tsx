import { gql, useQuery } from "@apollo/client";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { initializeApollo } from "../lib/client";

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
