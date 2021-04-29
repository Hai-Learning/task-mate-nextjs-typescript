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
    <UpdateTaskForm intialValues={{ title: task.title }} />
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
