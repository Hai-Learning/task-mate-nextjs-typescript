import React from "react";
import Link from "next/link";

const TaskFilter = () => {
  return (
    <ul className="task-filter">
      <li>
        <Link href="/" scroll={false}>
          <a>All</a>
        </Link>
      </li>
      <li>
        <Link href="/[status]" as="/active" scroll={false}>
          <a>Active</a>
        </Link>
      </li>
      <li>
        <Link href="/[status]" as="/completed" scroll={false}>
          <a>Completed</a>
        </Link>
      </li>
    </ul>
  );
};

export default TaskFilter;
