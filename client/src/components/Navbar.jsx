import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { ButtonLink } from "./ui/ButtonLink";

const roleBadgeClass = {
  admin: "bg-red-600 text-white",
  tutor: "bg-blue-600 text-white",
  student: "bg-green-600 text-white",
};

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  console.log(isAuthenticated, user)

  return (
    <nav className="bg-zinc-700 my-3 flex justify-between py-5 px-10 rounded-lg">
      <h1 className="text-2xl font-bold">
        <Link to={isAuthenticated ? "/tasks" : "/"}>Task Manager</Link>
      </h1>
      <ul className="flex gap-x-2 items-center">
        {isAuthenticated ? (
          <>
            <li className="flex items-center gap-x-2">
              Welcome {user.username}
              {user.role && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    roleBadgeClass[user.role] || "bg-zinc-500 text-white"
                  }`}
                >
                  {user.role}
                </span>
              )}
            </li>
            <li>
              <ButtonLink to="/add-task">Add Task</ButtonLink>
            </li>
            <li>
              <Link to="/" onClick={() => logout()}>
                Logout
              </Link>
            </li>
          </>
        ) : (
          <>
            <li>
              <ButtonLink to="/login">Login</ButtonLink>
            </li>
            <li>
              <ButtonLink to="/register">Register</ButtonLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
