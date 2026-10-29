import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import { useSessionUser, ProtectedRoute, RoleRoute } from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import Homepage from './components/Homepage';
import CreateUser from './components/CreateUser';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MyCourses from './components/MyCourses';
import Tutors from './components/Tutors';
import NotesList from './components/NotesList';
import UserProfile from './components/UserProfile';
import ChangeEmail from './components/ChangeEmail';
import ChangePassword from './components/ChangePassword';
import VideosList from './components/VideosList';
import TutorVideos from './components/TutorVideos';
import StudentHome from './components/StudentHome';
import TutorHome from './components/TutorHome';
import TutorCourses from './components/TutorCourses';
import TutorStudents from './components/TutorStudents';
import TutorAgenda from './components/TutorAgenda';
import TutorProgress from './components/TutorProgress';
import TutorNotifications from './components/TutorNotifications';
import TutorProfile from './components/TutorProfile';
import VideoProgressDashboard from './components/VideoProgressDashboard';
import Messages from './components/Messages';
import './App.css';
import { ThemeToggle } from './components/Theme';

const DashboardHome = () => {
  const user = useSessionUser();
  return user.role === 'tutor' || user.role === 'advisor'
    ? <TutorHome user={user} />
    : <StudentHome />;
};

const NotFound = () => (
  <main className="not-found">
    <ThemeToggle />
    <p className="eyebrow">COPÉRNICO</p>
    <h1>No encontramos esta página</h1>
    <p>La dirección puede haber cambiado o no estar disponible.</p>
    <Link className="btn btn-primary" to="/">Volver al inicio</Link>
  </main>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<><Navigation /><Homepage /></>} />
        <Route path="/home" element={<><Navigation /><Homepage /></>} />
        <Route path="/login" element={<><Navigation /><Login /></>} />
        <Route path="/signup" element={<><Navigation /><CreateUser /></>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<DashboardHome />} />
            <Route path="mensajes" element={<Messages />} />
            <Route element={<RoleRoute roles={['student', 'admin']} />}>
              <Route path="cursos" element={<MyCourses />} />
              <Route path="videos" element={<VideosList />} />
              <Route path="progreso-videos" element={<VideoProgressDashboard />} />
              <Route path="tutores" element={<Tutors />} />
              <Route path="notas" element={<NotesList />} />
              <Route path="perfil" element={<UserProfile />} />
            </Route>
            <Route element={<RoleRoute roles={['tutor', 'advisor']} />}>
              <Route path="cursos-tutor" element={<TutorCourses />} />
              <Route path="estudiantes" element={<TutorStudents />} />
              <Route path="agenda" element={<TutorAgenda />} />
              <Route path="videos-tutor" element={<TutorVideos />} />
              <Route path="progreso" element={<TutorProgress />} />
              <Route path="mensajes-tutor" element={<Messages />} />
              <Route path="notificaciones" element={<TutorNotifications />} />
              <Route path="perfil-tutor" element={<TutorProfile />} />
            </Route>
          </Route>
          <Route path="/account/change-email" element={<ChangeEmail />} />
          <Route path="/account/change-password" element={<ChangePassword />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
