import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Navigation } from "./components/Navigation";
import Homepage from "./components/Homepage";
import CreateUser from "./components/CreateUser";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import MyCourses from "./components/MyCourses";
import Tutors from "./components/Tutors";
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
import TutorProgress from "./components/TutorProgress";
import TutorNotifications from "./components/TutorNotifications";
import TutorProfile from "./components/TutorProfile";
import VideoProgressDashboard from "./components/VideoProgressDashboard";
import Messages from "./components/Messages";

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
            <Route path="/dashboard" element={<Dashboard />}>
              {/* Ruta index que se mostrará por defecto */}
              <Route index element={<StudentHome />} />
              {/* Rutas para estudiantes */}
              <Route path="cursos" element={<MyCourses />} />
              <Route path="videos" element={<VideosList />} />
              <Route path="progreso-videos" element={<VideoProgressDashboard />} />
              <Route path="tutores" element={<Tutors />} />
              <Route path="notas" element={<NotesList />} />
              <Route path="mensajes" element={<Messages />} />
              <Route path="perfil" element={<UserProfile />} />
              {/* Rutas específicas para tutores */}
              <Route path="cursos-tutor" element={<TutorCourses />} />
              <Route path="estudiantes" element={<TutorStudents />} />
              <Route path="agenda" element={<TutorAgenda />} />
              <Route path="videos-tutor" element={<TutorVideos />} />
              <Route path="progreso" element={<TutorProgress />} />
              <Route path="mensajes-tutor" element={<Messages />} />
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
