import Head from "next/head";
import { initializeApollo } from "../lib/client";
import {
  useTasksQuery,
  TasksQuery,
  TasksDocument,
} from "../generated/graphql-frontend";
import TaskList from "../components/TaskList";
import CreateTaskForm from "../components/CreateTaskForm";
import TaskFilter from "../components/TaskFilter";

export default function Home() {
  const result = useTasksQuery();
  // ? undefined or result.data
  const tasks = result.data?.tasks;

  return (
    <div>
      <Head>
        <title>Tasks</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* result.refetch is used to refreshing the page after completed a task */}
      <CreateTaskForm onSuccess={result.refetch} />
      {result.loading ? (
        <p>Loading tasks...</p>
      ) : result.error ? (
        <p>An error occurred.</p>
      ) : tasks && tasks.length > 0 ? (
        <TaskList tasks={tasks} />
      ) : (
        <p className="no-tasks-message">You've got no tasks</p>
      )}
      <TaskFilter />
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
