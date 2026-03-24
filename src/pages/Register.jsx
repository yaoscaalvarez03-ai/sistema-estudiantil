import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { Sun, Moon, User, Lock, Mail, Phone, MapPin, Calendar, CreditCard, Users, ArrowLeft } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    genero: '',
    fechaNacimiento: '',
    email: '',
    password: '',
    confirmPassword: '',
    celular1: '',
    celular2: '',
    direccion: '',
    groupId: ''
  });
  
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .order('name');
          
        if (error) throw error;
        setGroups(data);
      } catch (err) {
        console.error("Error fetching groups:", err);
      }
    };
    fetchGroups();
  }, []);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      return setError('Las contraseñas no coinciden.');
    }

    if (formData.password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }

    setLoading(true);

    try {
      // 1. Verificar si el correo ya existe en 'users'
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email.toLowerCase().trim())
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) {
        setError('Este correo ya está registrado en el sistema.');
        setLoading(false);
        return;
      }

      // 2. Verificar si ya hay una solicitud pendiente o aprobada
      const { data: existingReq, error: reqError } = await supabase
        .from('registration_requests')
        .select('email')
        .eq('email', formData.email.toLowerCase().trim())
        .in('status', ['pending', 'approved'])
        .maybeSingle();

      if (reqError) throw reqError;
      if (existingReq) {
        setError('Ya existe una solicitud de registro pendiente para este correo.');
        setLoading(false);
        return;
      }

      // 3. Guardar solicitud en Supabase
      const { error: insertError } = await supabase
        .from('registration_requests')
        .insert([{
          ...formData,
          email: formData.email.toLowerCase().trim(),
          status: 'pending',
          role: 'student'
        }]);

      if (insertError) throw insertError;

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('Hubo un error al enviar tu solicitud. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-[#0b1120] text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl z-10 mx-4 text-center transition-colors duration-300 ${isDarkMode ? 'bg-[#151c2c] border border-gray-800/50' : 'bg-white border border-gray-200'}`}>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">¡Solicitud Enviada!</h2>
          <p className={`mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Tus datos han sido registrados exitosamente. Nuestro equipo administrativo revisará tu perfil para aprobar el ingreso.
          </p>
          <button 
            onClick={() => navigate('/')}
            className={`w-full py-3 px-4 rounded-xl text-sm font-medium text-white transition-all duration-200 ${
              isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
      
      {/* Absolute Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className={`fixed top-4 right-4 p-2 rounded-full z-50 focus:outline-none transition-colors duration-200 ${
          isDarkMode ? 'text-gray-500 hover:text-yellow-400' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      {/* Main Card */}
      <div className={`max-w-[700px] w-full p-8 rounded-3xl shadow-2xl relative transition-colors duration-300 ${isDarkMode ? 'bg-[#151c2c] border border-gray-800/50' : 'bg-white border border-gray-200'}`}>
          
          {/* Back Button */}
          <Link to="/" className={`absolute top-6 left-6 flex items-center text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
             <ArrowLeft size={16} className="mr-1" />
             Atrás
          </Link>

          <div className="flex flex-col items-center text-center mb-8 mt-4">
            <h2 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Solicitud de Ingreso Estudiantil
            </h2>
            <p className={`mt-2 text-sm ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-500'}`}>
              Completa el siguiente formulario para que tu cuenta sea aprobada.
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombres */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Nombres</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <User size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <input name="nombres" type="text" required value={formData.nombres} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`} placeholder="Tus nombres" />
                    </div>
                </div>

                {/* Apellidos */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Apellidos</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <User size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <input name="apellidos" type="text" required value={formData.apellidos} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`} placeholder="Tus apellidos" />
                    </div>
                </div>

                {/* Cédula */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Cédula de Identidad</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <CreditCard size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <input name="cedula" type="text" required value={formData.cedula} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`} placeholder="XXX-XXXXXX-XXXXX" />
                    </div>
                </div>

                {/* Género */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Género</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Users size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <select name="genero" required value={formData.genero} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors appearance-none ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`}>
                            <option value="" disabled>Selecciona tu género</option>
                            <option value="Hombre">Hombre</option>
                            <option value="Mujer">Mujer</option>
                        </select>
                    </div>
                </div>

                {/* Fecha de Nacimiento */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Fecha de Nacimiento</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Calendar size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <input name="fechaNacimiento" type="date" required value={formData.fechaNacimiento} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`} />
                    </div>
                </div>

                {/* Correo Electrónico */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Correo Electrónico (Será tu usuario)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <input name="email" type="email" required value={formData.email} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`} placeholder="tucorreo@ejemplo.com" />
                    </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Crear Contraseña</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Lock size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <input name="password" type="password" required value={formData.password} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`} placeholder="Mínimo 6 caracteres" minLength="6" />
                    </div>
                </div>

                {/* Confirmar Contraseña */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Confirmar Contraseña</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Lock size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`} placeholder="Comprueba tu contraseña" minLength="6" />
                    </div>
                </div>

                {/* Celular 1 */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Celular Principal</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Phone size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <input name="celular1" type="tel" required value={formData.celular1} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`} placeholder="+505 8888 8888" />
                    </div>
                </div>

                {/* Celular 2 (Opcional) */}
                <div className="space-y-1.5">
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Celular Secundario <span className="text-gray-500">(Opcional)</span></label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Phone size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                        </div>
                        <input name="celular2" type="tel" value={formData.celular2} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`} placeholder="+505 8888 8888" />
                    </div>
                </div>
            </div>

            {/* Dirección */}
            <div className="space-y-1.5">
                <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Dirección Domiciliar</label>
                <div className="relative">
                    <div className="absolute top-3 left-0 pl-3.5 flex items-start pointer-events-none">
                        <MapPin size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                    </div>
                    <textarea name="direccion" required value={formData.direccion} onChange={handleChange} rows="3"
                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors resize-none ${
                        isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`} placeholder="Escribe tu dirección completa..."></textarea>
                </div>
            </div>

            {/* Grupo */}
            <div className="space-y-1.5">
                <label className={`block text-xs font-medium ${isDarkMode ? 'text-[#8b95a5]' : 'text-gray-700'}`}>Grupo (Opcional)</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Users size={18} className={isDarkMode ? 'text-[#64748b]' : 'text-gray-400'} />
                    </div>
                    <select name="groupId" value={formData.groupId} onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors appearance-none ${
                            isDarkMode ? 'bg-[#0b1120] border-[#2a3040] text-gray-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`}>
                        <option value="">Selecciona tu grupo (si ya tienes uno)</option>
                        {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" disabled={loading}
                className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white transition-all duration-200 md:w-1/2 md:mx-auto ${
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
                    Enviando Solicitud...
                  </span>
                ) : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
