import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Navigation } from "./components/Navigation";
import Homepage from "./components/Homepage";
import CreateUser from "./components/CreateUser";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <>
              <Navigation />
              <Homepage />
            </>
          } />
          <Route path="/home" element={
            <>
              <Navigation />
              <Homepage />
            </>
          } />
          <Route path="/login" element={
            <>
              <Navigation />
              <Login />
            </>
          } />
          <Route path="/signup" element={
            <>
              <Navigation />
              <CreateUser />
            </>
          } />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/cursos" element={<Dashboard />} />
            <Route path="/dashboard/tutores" element={<Dashboard />} />
            <Route path="/dashboard/notas" element={<Dashboard />} />
            <Route path="/dashboard/perfil" element={<Dashboard />} />
            <Route path="/dashboard/configuracion" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
