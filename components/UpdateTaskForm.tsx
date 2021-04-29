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
