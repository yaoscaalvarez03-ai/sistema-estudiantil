import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { auth, db } from './firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ExamTaker from './pages/student/ExamTaker';
import PrivateRoute from './components/PrivateRoute';

// Componente para redirigir desde Login si ya está logueado
const PublicRoute = ({ children }) => {
  const { user, role, loading } = useAuth();
  const { isDarkMode } = useTheme();
  
  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0b1120] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
  
  if (user) {
    // Si el usuario está autenticado pero aún se está cargando el rol de Firestore
    if (!role) return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#0b1120] text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
        <p className="text-sm font-medium animate-pulse">Sincronizando perfil...</p>
      </div>
    );

    if (role === 'admin') return <Navigate to="/admin" />;
    if (role === 'teacher') return <Navigate to="/teacher" />;
    if (role === 'student') return <Navigate to="/student" />;
    
    // Si hay usuario pero no hay rol asignado (posible cuenta huérfana o error de sync)
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-[#0b1120] text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center max-w-md w-full p-8 rounded-3xl animate-in fade-in zoom-in duration-300 shadow-2xl bg-red-500/10 border border-red-500/20">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Acceso Restringido</h2>
          <p className="opacity-70 mb-8 text-sm leading-relaxed">
            Tu cuenta (`{user.email}`) está autenticada, pero no tiene un perfil activo o rol asignado en el sistema escolar.
            <br /><br />
            Si eres estudiante, contacta a la administración para que aprueben tu solicitud.
          </p>
          
          <button 
            onClick={() => auth.signOut()} 
            className="w-full px-6 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <PrivateRoute allowedRoles={['admin']}>
                 <AdminDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/student/*" 
            element={
              <PrivateRoute allowedRoles={['student']}>
                <StudentDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/teacher/*" 
            element={
              <PrivateRoute allowedRoles={['teacher', 'admin']}>
                <TeacherDashboard />
              </PrivateRoute>
            } 
          />
          {/* Exam-taking route — accessible by students */}
          <Route
            path="/exam/:examId"
            element={
              <PrivateRoute allowedRoles={['student', 'admin', 'teacher']}>
                <ExamTaker />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
