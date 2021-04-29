import React, { useState } from "react";
import { useUpdateTaskMutation } from "../generated/graphql-frontend";
import { useRouter } from "next/router";

interface Values {
  title: string;
}

interface Props {
  id: number;
  intialValues: Values;
}

const UpdateTaskForm: React.FC<Props> = ({ intialValues, id }) => {
  const [values, setValues] = useState<Values>(intialValues);
  const handlerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prevValues) => ({ ...prevValues, [name]: value }));
  };

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
      {error && <p className="alert-error">{errorMessage}</p>}
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
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Loading" : "Save"}
        </button>
      </p>
    </form>
  );
};

export default UpdateTaskForm;
