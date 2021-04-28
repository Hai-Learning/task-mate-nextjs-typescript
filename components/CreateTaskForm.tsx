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
