import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  // Si se envían roles específicos y el usuario no los tiene
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirigir según el rol que sí tenga
    if (role === 'admin') return <Navigate to="/admin" />;
    if (role === 'student') return <Navigate to="/student" />;
    return <Navigate to="/" />; // Fallback
  }

  return children;
}
