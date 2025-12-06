import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Navigation } from "./components/Navigation";
import Homepage from "./components/Homepage";
import CreateUser from "./components/CreateUser";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import MyCourses from "./components/MyCourses";
import Advisories from "./components/Advisories";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangeEmail from "./components/ChangeEmail";
import ChangePassword from "./components/ChangePassword";

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
            <Route path="/dashboard/cursos" element={<MyCourses />} />
            <Route path="/dashboard/tutores" element={<Dashboard />} />
            <Route path="/dashboard/asesoria" element={<Advisories />} />
            <Route path="/dashboard/notas" element={<Dashboard />} />
            <Route path="/dashboard/perfil" element={<Dashboard />} />
            <Route path="/dashboard/configuracion" element={<Dashboard />} />
            <Route path="/account/change-email" element={<ChangeEmail />} />
            <Route path="/account/change-password" element={<ChangePassword />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
