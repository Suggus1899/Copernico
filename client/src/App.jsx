import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Navigation } from "./components/Navigation";
import Homepage from "./components/Homepage";
import CreateUser from "./components/CreateUser";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import Dashboard from "./components/Dashboard";
import MyCourses from "./components/MyCourses";
import Advisories from "./components/Advisories";
import Tutors from "./components/Tutors";
import NotesList from "./components/NotesList";
import UserProfile from "./components/UserProfile";
import Settings from "./components/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangeEmail from "./components/ChangeEmail";
import ChangePassword from "./components/ChangePassword";
// Componentes de Videos
import VideosList from "./components/VideosList";
import TutorVideos from "./components/TutorVideos";
// Componentes de Tutor
import TutorCourses from "./components/TutorCourses";
import TutorStudents from "./components/TutorStudents";
import TutorAgenda from "./components/TutorAgenda";
import TutorMaterials from "./components/TutorMaterials";
import TutorProgress from "./components/TutorProgress";
import TutorNotifications from "./components/TutorNotifications";
import TutorProfile from "./components/TutorProfile";

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
          <Route path="/forgot-password" element={
            <>
              <Navigation />
              <ForgotPassword />
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
            <Route path="/dashboard/videos" element={<VideosList />} />
            <Route path="/dashboard/tutores" element={<Tutors />} />
            <Route path="/dashboard/asesoria" element={<Advisories />} />
            <Route path="/dashboard/notas" element={<NotesList />} />
            <Route path="/dashboard/perfil" element={<UserProfile />} />
            <Route path="/dashboard/configuracion" element={<Settings />} />
            <Route path="/account/change-email" element={<ChangeEmail />} />
            <Route path="/account/change-password" element={<ChangePassword />} />
            {/* Rutas específicas para tutores */}
            <Route path="/dashboard/cursos-tutor" element={<TutorCourses />} />
            <Route path="/dashboard/estudiantes" element={<TutorStudents />} />
            <Route path="/dashboard/agenda" element={<TutorAgenda />} />
            <Route path="/dashboard/materiales" element={<TutorMaterials />} />
            <Route path="/dashboard/videos-tutor" element={<TutorVideos />} />
            <Route path="/dashboard/progreso" element={<TutorProgress />} />
            <Route path="/dashboard/notificaciones" element={<TutorNotifications />} />
            <Route path="/dashboard/perfil-tutor" element={<TutorProfile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
