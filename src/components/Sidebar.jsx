import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  UserCheck, 
  LogOut, 
  Sun, 
  Moon,
  ChevronLeft,
  LayoutDashboard,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';

export default function Sidebar({ isOpen, toggleSidebar, isMobile }) {
  const { logout, user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'Usuarios', icon: <Users size={20} />, path: '/admin/users' },
    { name: 'Solicitudes', icon: <UserCheck size={20} />, path: '/admin/requests' },
    { name: 'Clases', icon: <BookOpen size={20} />, path: '/admin/classes' },
    { name: 'Carreras', icon: <BookOpen size={20} />, path: '/admin/careers' },
    { name: 'Grupos', icon: <Users size={20} />, path: '/admin/groups' },
    { name: 'Pruebas', icon: <ClipboardList size={20} />, path: '/admin/tasks' },
    { name: 'Mensajes', icon: <MessageSquare size={20} />, path: '/admin/chat' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const sidebarClasses = `
    fixed top-0 left-0 h-full z-40 transition-all duration-300 transform
    ${isDarkMode ? 'bg-[#151c2c] border-r border-gray-800' : 'bg-white border-r border-gray-200'}
    ${isMobile ? (isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64') : (isOpen ? 'w-64' : 'w-20')}
  `;

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 mb-4 mt-2">
            <div className={`flex items-center overflow-hidden transition-all duration-300 ${!isOpen && !isMobile ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold mr-3 shrink-0 ${
                isDarkMode ? 'bg-[#0f172a] border border-cyan-500/50 text-cyan-400' : 'bg-indigo-600 text-white'
              }`}>
                S
              </div>
              <span className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Admin Panel
              </span>
            </div>
            {!isMobile && (
              <button 
                onClick={toggleSidebar}
                className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
              </button>
            )}
            {isMobile && (
              <button onClick={toggleSidebar} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                <X size={24} />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) toggleSidebar();
                }}
                className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all group ${
                  isActive(item.path)
                    ? (isDarkMode ? 'bg-[#007aff] text-white' : 'bg-indigo-600 text-white')
                    : (isDarkMode ? 'text-gray-400 hover:bg-gray-800/50 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600')
                }`}
              >
                <div className="shrink-0">{item.icon}</div>
                <span className={`ml-3 font-medium transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                  {item.name}
                </span>
                {!isOpen && !isMobile && (
                   <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {item.name}
                   </div>
                )}
              </button>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="px-3 pb-6 mt-4 border-t border-gray-800/50 pt-4 space-y-1">
            <button
              onClick={toggleTheme}
              className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all ${
                isDarkMode ? 'text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              <span className={`ml-3 font-medium transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                Tema {isDarkMode ? 'Claro' : 'Oscuro'}
              </span>
            </button>
            
            <button
              onClick={handleLogout}
              className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all ${
                isDarkMode ? 'text-gray-400 hover:bg-red-500/10 hover:text-red-500' : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <LogOut size={20} />
              <span className={`ml-3 font-medium transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                Cerrar Sesión
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
