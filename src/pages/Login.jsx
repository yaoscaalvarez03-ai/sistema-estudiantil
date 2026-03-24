import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { Sun, Moon, User, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
      
      {/* Absolute Theme Toggle Button (Maintained per user request but styled minimally) */}
      <button 
        onClick={toggleTheme}
        className={`absolute top-4 right-4 p-2 rounded-full z-10 focus:outline-none transition-colors duration-200 ${
          isDarkMode ? 'text-gray-500 hover:text-yellow-400' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      {/* Main Card */}
      <div className={`max-w-[400px] w-full p-8 rounded-3xl shadow-2xl z-10 mx-4 transition-colors duration-300 ${isDarkMode ? 'bg-[#151c2c] border border-gray-800/50' : 'bg-white border border-gray-200'}`}>
          
          <div className="flex flex-col items-center text-center mb-8">
            {/* Glowing Logo matching screenshot */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 ${
               isDarkMode 
                 ? 'bg-[#0f172a] border-2 border-cyan-500/80 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
                 : 'bg-indigo-600 border-2 border-indigo-500 text-white shadow-lg'
            }`}>
              S
            </div>
            
            <h2 className={`text-2xl font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Bienvenido de nuevo
            </h2>
            <p className={`mt-2 text-sm ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-500'}`}>
              Sistema Estudiantil - Acceso Seguro
            </p>
          </div>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            {/* User Input */}
            <div className="space-y-1.5">
              <label htmlFor="email-address" className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                </div>
                <input 
                  id="email-address" name="email" type="email" autoComplete="email" required 
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-sm focus:outline-none transition-colors ${
                    isDarkMode 
                      ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 placeholder-[#475569] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`} 
                  placeholder="Ingresa tu correo" 
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                </div>
                <input 
                  id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required 
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-xl text-sm focus:outline-none transition-colors ${
                    isDarkMode 
                      ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 placeholder-[#475569] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  }`} 
                  placeholder="••••••••" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center focus:outline-none"
                >
                  {showPassword 
                    ? <EyeOff size={18} className={isDarkMode ? 'text-[#64748b] hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} /> 
                    : <Eye size={18} className={isDarkMode ? 'text-[#64748b] hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} />
                  }
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" disabled={loading}
                className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-[#007aff] hover:bg-[#0062cc] shadow-[0_4px_14px_0_rgba(0,122,255,0.39)]' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Conectando...
                  </span>
                ) : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
             <Link to="/register" className={`text-sm font-medium hover:underline transition-colors ${isDarkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-indigo-600 hover:text-indigo-500'}`}>
               ¿Eres estudiante? Solicita tu ingreso aquí
             </Link>
          </div>

          <div className="mt-6 text-center px-4">
             <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-[#475569]' : 'text-gray-400'}`}>
                © {new Date().getFullYear()} Sistema Estudiantil. Todos los derechos reservados.
             </p>
          </div>
      </div>
    </div>
  );
}
