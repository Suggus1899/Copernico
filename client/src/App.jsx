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
import AdvisorsList from "./components/AdvisorsList";
import NotesList from "./components/NotesList";
import UserProfile from "./components/UserProfile";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangeEmail from "./components/ChangeEmail";
import ChangePassword from "./components/ChangePassword";
// Componentes de Videos
import VideosList from "./components/VideosList";
import TutorVideos from "./components/TutorVideos";
// Componentes de Home
import StudentHome from "./components/StudentHome";
import TutorHome from "./components/TutorHome";
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
            <Route path="/dashboard" element={<Dashboard />}>
              {/* Ruta index que se mostrará por defecto */}
              <Route index element={<StudentHome />} />
              {/* Rutas para estudiantes */}
              <Route path="cursos" element={<MyCourses />} />
              <Route path="videos" element={<VideosList />} />
              <Route path="tutores" element={<Tutors />} />
              <Route path="asesores" element={<AdvisorsList />} />
              <Route path="asesoria" element={<Advisories />} />
              <Route path="notas" element={<NotesList />} />
              <Route path="perfil" element={<UserProfile />} />
              {/* Rutas específicas para tutores */}
              <Route path="cursos-tutor" element={<TutorCourses />} />
              <Route path="estudiantes" element={<TutorStudents />} />
              <Route path="agenda" element={<TutorAgenda />} />
              <Route path="materiales" element={<TutorMaterials />} />
              <Route path="videos-tutor" element={<TutorVideos />} />
              <Route path="progreso" element={<TutorProgress />} />
              <Route path="notificaciones" element={<TutorNotifications />} />
              <Route path="perfil-tutor" element={<TutorProfile />} />
            </Route>
            <Route path="/account/change-email" element={<ChangeEmail />} />
            <Route path="/account/change-password" element={<ChangePassword />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
