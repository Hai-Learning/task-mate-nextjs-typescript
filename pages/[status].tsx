import Head from "next/head";
import { initializeApollo } from "../lib/client";
import {
  useTasksQuery,
  TasksQuery,
  TasksDocument,
  TaskStatus,
} from "../generated/graphql-frontend";
import TaskList from "../components/TaskList";
import CreateTaskForm from "../components/CreateTaskForm";
import TaskFilter from "../components/TaskFilter";
import { useRouter } from "next/router";
import Error from "next/error";
import { GetServerSideProps } from "next";
import { TaskQueryVariables } from "../generated/graphql-frontend";

const isTaskStatus = (value: string): value is TaskStatus =>
  Object.values(TaskStatus).includes(value as TaskStatus);

export default function Home() {
  const router = useRouter();
  const status =
    typeof router.query.status === "string" ? router.query.status : undefined;
  if (status !== undefined && !isTaskStatus(status)) {
    return <Error statusCode={404} />;
  }
  const result = useTasksQuery({ variables: { status } });

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

export const getServerSideProps: GetServerSideProps = async (context) => {
  const status =
    typeof context.params?.status === "string"
      ? context.params.status
      : undefined;
  if (status === undefined || isTaskStatus(status)) {
    const ApolloClient = initializeApollo();

    await ApolloClient.query<TasksQuery>({
      query: TasksDocument,
      variables: { status },
    });

    return {
      props: {
        initialApolloState: ApolloClient.cache.extract(),
      },
    };
  }
  return { props: {} };
};
