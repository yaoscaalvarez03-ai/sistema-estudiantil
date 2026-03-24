import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  LayoutDashboard, BookOpen, ClipboardList, Users,
  LogOut, Sun, Moon, Menu, X, ChevronLeft,
  GraduationCap, ClipboardCheck, TrendingUp, FileText,
  MessageSquare, Send, User, Edit2, Lock, Save, Phone, MapPin, Calendar, Award
} from 'lucide-react';
import { functions } from '../firebase/config';
import { useParams } from 'react-router-dom';

// Functional Components
import AdminHome from './admin/AdminHome';
import TaskManagement from './admin/TaskManagement';
import ExamBuilder from './admin/ExamBuilder';
import ExamResults from './admin/ExamResults';
import GroupChat from './student/GroupChat';
import PrivateChat from './student/PrivateChat';

// Wrappers
const ExamResultsPage = () => {
  const { examId } = useParams();
  return <ExamResults examId={examId} />;
};

const ExamEditPage = () => {
  const { examId } = useParams();
  return <ExamBuilder examId={examId} />;
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
function TeacherSidebar({ isOpen, toggle, isMobile }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { name: 'Inicio', icon: <LayoutDashboard size={20} />, path: '/teacher' },
    { name: 'Mis Clases', icon: <BookOpen size={20} />, path: '/teacher/classes' },
    { name: 'Mis Grupos', icon: <Users size={20} />, path: '/teacher/groups' },
    { name: 'Exámenes', icon: <ClipboardList size={20} />, path: '/teacher/exams' },
    { name: 'Asistencia', icon: <ClipboardCheck size={20} />, path: '/teacher/attendance' },
    { name: 'Sala de Chat', icon: <MessageSquare size={20} />, path: '/teacher/chat' },
    { name: 'Mensajes Privados', icon: <Send size={20} />, path: '/teacher/messages' },
    { name: 'Mi Perfil', icon: <User size={20} />, path: '/teacher/profile' },
    { name: 'Resultados', icon: <TrendingUp size={20} />, path: '/teacher/results' },
  ];

  const isActive = (path) => path === '/teacher' ? location.pathname === '/teacher' : location.pathname.startsWith(path);

  const handleLogout = async () => { try { await logout(); navigate('/'); } catch (e) { console.error(e); } };

  const sidebarCls = `fixed top-0 left-0 h-full z-40 transition-all duration-300 transform
    ${isDarkMode ? 'bg-[#151c2c] border-r border-gray-800' : 'bg-white border-r border-gray-200'}
    ${isMobile ? (isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64') : (isOpen ? 'w-64' : 'w-20')}`;

  return (
    <>
      {isMobile && isOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={toggle} />}
      <aside className={sidebarCls}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 mb-4 mt-2">
            <div className={`flex items-center overflow-hidden transition-all duration-300 ${!isOpen && !isMobile ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold mr-3 shrink-0 ${isDarkMode ? 'bg-[#0f172a] border border-cyan-500/50 text-cyan-400' : 'bg-indigo-600 text-white'}`}>D</div>
              <span className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Panel Docente</span>
            </div>
            {!isMobile && (
              <button onClick={toggle} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}>
                {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
              </button>
            )}
            {isMobile && <button onClick={toggle} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}><X size={24} /></button>}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-1">
            {items.map(item => (
              <button key={item.name} onClick={() => { navigate(item.path); if (isMobile) toggle(); }}
                className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all group ${
                  isActive(item.path)
                    ? (isDarkMode ? 'bg-[#007aff] text-white' : 'bg-indigo-600 text-white')
                    : (isDarkMode ? 'text-gray-400 hover:bg-gray-800/50 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600')
                }`}>
                <div className="shrink-0">{item.icon}</div>
                <span className={`ml-3 font-medium transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 pb-6 mt-4 border-t border-gray-800/50 pt-4 space-y-1">
            <button onClick={toggleTheme} className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400' : 'text-gray-600 hover:bg-gray-50'}`}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              <span className={`ml-3 font-medium transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Tema {isDarkMode ? 'Claro' : 'Oscuro'}</span>
            </button>
            <button onClick={handleLogout} className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all ${isDarkMode ? 'text-gray-400 hover:bg-red-500/10 hover:text-red-500' : 'text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
              <LogOut size={20} />
              <span className={`ml-3 font-medium transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Teacher Home ──────────────────────────────────────────────────────────────
function TeacherHome() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ groups: 0, exams: 0, students: 0 });
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    // 1. Fetch Profile (Real-time)
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });

    // 3. Count exams and groups
    const fetchCounts = async () => {
      try {
        const gSnap = await getDocs(query(collection(db, 'groups'), where('teacherId', '==', user.uid)));
        const myGroupIds = gSnap.docs.map(d => d.id);
        const groupList = gSnap.docs.map(d => d.data());
        const uniqueStudents = [...new Set(groupList.flatMap(g => g.studentIds || []))];
        
        const eSnap = await getDocs(collection(db, 'exams'));
        const examsVisible = eSnap.docs.filter(d => {
          const ex = d.data();
          return ex.teacherId === user.uid || (ex.assignedGroups && ex.assignedGroups.some(gid => myGroupIds.includes(gid)));
        });

        setStats({
          groups: gSnap.size,
          students: uniqueStudents.length,
          exams: examsVisible.length
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchCounts();

    return () => unsubProfile();
  }, [user]);

  const userName = profile?.nombres 
    ? `${profile.nombres} ${profile.apellidos || ''}`.trim() 
    : profile?.displayName || user?.displayName || 'Docente';

  const card = `rounded-3xl border p-6 ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  return (
    <div className="p-4 md:p-6 pb-20">
      <div className="mb-8">
        <h1 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Bienvenido, <span className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}>{userName}</span> 👋
        </h1>
        <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Profile Info Card (Requested) */}
        <div className={`lg:col-span-2 rounded-[2.5rem] border p-8 flex flex-col md:flex-row gap-8 items-center md:items-start ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-100 shadow-xl shadow-indigo-500/5'}`}>
           <div className={`w-24 h-24 rounded-[2.5rem] shrink-0 flex items-center justify-center text-3xl font-black ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>
             {userName[0]}
           </div>
           <div className="flex-1 w-full text-center md:text-left">
              <h2 className={`text-xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mi Perfil Profesional</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                {[
                  { l: 'Cédula', v: profile?.cedula },
                  { l: 'Género', v: profile?.genero },
                  { l: 'Cumpleaños', v: profile?.fechaNacimiento },
                  { l: 'Contacto', v: profile?.celular1 },
                ].map((it, i) => (
                  <div key={i} className={`flex flex-col py-1 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-50'}`}>
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-mono">{it.l}</span>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{it.v || '---'}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => navigate('/teacher/profile')}
                className={`mt-6 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
              >
                Ver Perfil Completo
              </button>
           </div>
        </div>

        {/* Mini Stats (Compact) */}
        <div className="grid grid-cols-1 gap-4">
          <div className={`${card} flex items-center gap-4 py-6`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-500">Mis Grupos</p>
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.groups}</h3>
            </div>
          </div>
          <div className={`${card} flex items-center gap-4 py-6`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-500">Exámenes</p>
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.exams}</h3>
            </div>
          </div>
          <div className={`${card} flex items-center gap-4 py-6`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-500">Alumnos</p>
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.students}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className={card}>
        <h2 className={`text-base font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Accesos Rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ver Grupos', icon: <Users size={18} />, path: '/teacher/groups', cls: isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700' },
            { label: 'Nuevo Examen', icon: <FileText size={18} />, path: '/teacher/exams', cls: isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700' },
            { label: 'Sala de Chat', icon: <MessageSquare size={18} />, path: '/teacher/chat', cls: isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700 shadow-sm' },
            { label: 'Mensajes Privados', icon: <Send size={18} />, path: '/teacher/messages', cls: isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700 shadow-sm' },
            { label: 'Asistencia', icon: <ClipboardCheck size={18} />, path: '/teacher/attendance', cls: isDarkMode ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-700' },
            { label: 'Resultados', icon: <TrendingUp size={18} />, path: '/teacher/results', cls: isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700' },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              className={`flex flex-col items-center gap-2 py-5 rounded-2xl text-sm font-bold transition-all hover:scale-105 ${a.cls}`}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Teacher Chat Selection ───────────────────────────────────────────────────
function TeacherChatRoom() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // 1. Load Profile (Real-time)
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });

    // 2. Load Assigned Groups
    const unsub = onSnapshot(query(collection(db, 'groups'), where('teacherId', '==', user.uid)), (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => { unsubProfile(); unsub(); };
  }, [user]);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando grupos...</div>;

  if (selectedGroup) {
    return (
      <div className="relative h-full">
         <button 
           onClick={() => setSelectedGroup(null)}
           className={`absolute top-6 right-6 z-10 p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:text-indigo-600'}`}
         >
           <ChevronLeft size={14} /> Salir del Chat
         </button>
         <GroupChat group={selectedGroup} profile={profile} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sala de Chat Grupal</h1>
      <p className="text-gray-500 text-sm mb-8 font-medium italic">Selecciona uno de tus grupos asignados para iniciar la comunicación.</p>
      
      {groups.length === 0 ? (
        <div className={`p-20 text-center rounded-[2rem] border-2 border-dashed ${isDarkMode ? 'border-gray-800 text-gray-600' : 'border-gray-200 text-gray-400'}`}>
          <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
          <p>No tienes grupos asignados para chatear.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(g => (
            <button 
              key={g.id} 
              onClick={() => setSelectedGroup(g)}
              className={`p-6 rounded-[2rem] border text-left transition-all hover:scale-[1.02] group ${
                isDarkMode ? 'bg-[#151c2c] border-gray-800 hover:border-cyan-500/50' : 'bg-white border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all ${isDarkMode ? 'bg-gray-800 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                <Users size={24} />
              </div>
              <h3 className={`font-bold text-lg mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{g.name}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{g.description || 'Sin descripción'}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  {g.studentIds?.length || 0} Alumnos
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TeacherPrivateMessages() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [profile, setProfile] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // 1. Load Profile
    getDocs(query(collection(db, 'users'), where('uid', '==', user.uid))).then(snap => {
      if (!snap.empty) {
        const p = snap.docs[0].data();
        setProfile(p);
      }
    });

    // 2. Load any assigned group to populate contacts
    // For a teacher, we consolidate all students from all their groups + fellow teachers/admins
    getDocs(query(collection(db, 'groups'), where('teacherId', '==', user.uid))).then(snap => {
      const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroup({
        id: 'teacher-contacts',
        name: 'Mis Contactos',
        studentIds: [...new Set(groups.flatMap(g => g.studentIds || []))],
        teacherId: user.uid,
        isTeacherView: true // Flag to tell PrivateChat to load all teachers/admins
      });
      setLoading(false);
    });
  }, [user]);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando contactos...</div>;

  return <PrivateChat profile={profile} group={group} />;
}

function TeacherProfile() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        if (!isEditing) setFormData(data);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user, isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        nombres: formData.nombres || '',
        apellidos: formData.apellidos || '',
        celular1: formData.celular1 || '',
        celular2: formData.celular2 || '',
        direccion: formData.direccion || '',
        genero: formData.genero || '',
        fechaNacimiento: formData.fechaNacimiento || '',
        cedula: formData.cedula || ''
      });
      setIsEditing(false);
      alert('¡Perfil actualizado!');
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPass.length < 6) return alert('Mínimo 6 caracteres');
    setIsChangingPass(true);
    try {
      const changeOwnPassword = httpsCallable(functions, 'changeOwnPassword');
      await changeOwnPassword({ newPassword: newPass });
      alert('Contraseña actualizada');
      setShowPassModal(false);
      setNewPass('');
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    } finally {
      setIsChangingPass(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 italic">Cargando perfil...</div>;

  const lbl = `text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`;
  const val = `text-sm font-bold mt-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`;
  const inp = `w-full bg-transparent border-b py-1 text-sm font-bold outline-none transition-all ${isDarkMode ? 'border-gray-800 focus:border-cyan-500 text-white' : 'border-gray-200 focus:border-indigo-600 text-gray-900'}`;

  const field = (label, key, icon) => {
    const isAlreadyFilled = profile && profile[key] && String(profile[key]).trim() !== '';

    return (
      <div className={`py-4 border-b last:border-0 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className={lbl}>{label}</span>
        </div>
        {isEditing && !isAlreadyFilled ? (
          <input 
            className={inp} 
            value={formData[key] || ''} 
            onChange={e => setFormData({...formData, [key]: e.target.value})}
            placeholder="Rellenar..."
          />
        ) : (
          <span className={val}>{profile?.[key] || '---'}</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-20">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-2xl font-black ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700'}`}>
            {(profile?.nombres?.[0] || 'D')}{(profile?.apellidos?.[0] || '')}
          </div>
          <div>
            <h1 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile?.nombres} {profile?.apellidos}</h1>
            <p className="text-gray-500 text-sm">{profile?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
           {!isEditing ? (
             <button onClick={() => setIsEditing(true)} 
               className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
               <Edit2 size={14} /> EDITAR
             </button>
           ) : (
             <button onClick={handleSave} disabled={isSaving}
               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white transition-all bg-green-600 hover:bg-green-700`}>
               <Save size={14} /> {isSaving ? '...' : 'GUARDAR'}
             </button>
           )}
           <button onClick={() => setShowPassModal(true)} 
             className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
             <Lock size={14} /> CLAVE
           </button>
        </div>
      </div>

      <div className={`rounded-[2.5rem] border overflow-hidden ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-100 shadow-xl shadow-indigo-500/5'}`}>
        <div className={`px-8 py-6 border-b ${isDarkMode ? 'bg-gray-800/20 border-gray-800' : 'bg-gray-50/50 border-gray-100'}`}>
          <h2 className={`font-black uppercase tracking-tighter ${isDarkMode ? 'text-indigo-400' : 'text-indigo-900'}`}>Ficha Profesional</h2>
        </div>
        <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {field('Nombres', 'nombres', <User size={12} className="text-gray-500"/>)}
          {field('Apellidos', 'apellidos', <User size={12} className="text-gray-500"/>)}
          {field('Cédula de Identidad', 'cedula', <Award size={12} className="text-gray-500"/>)}
          {field('Género', 'genero', <User size={12} className="text-gray-500"/>)}
          {field('Fecha de Nacimiento', 'fechaNacimiento', <Calendar size={12} className="text-gray-500"/>)}
          {field('Celular Principal', 'celular1', <Phone size={12} className="text-gray-500"/>)}
          {field('Celular Secundario', 'celular2', <Phone size={12} className="text-gray-500"/>)}
          <div className="md:col-span-2">
            {field('Dirección Domiciliar', 'direccion', <MapPin size={12} className="text-gray-500"/>)}
          </div>
        </div>
      </div>
      
      {/* Pass Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className={`w-full max-w-sm rounded-[2.5rem] border p-8 shadow-2xl ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-100'}`}>
             <h2 className={`text-xl font-black mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Seguridad</h2>
             <div className="space-y-4">
               <div>
                  <label className={lbl}>Nueva Contraseña</label>
                  <input 
                    type="password"
                    className={`w-full mt-2 px-5 py-3.5 rounded-2xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-gray-800/50 border-gray-700 focus:border-cyan-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-indigo-600 text-gray-900'}`}
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                  />
               </div>
               <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowPassModal(false)} className={`flex-1 py-3.5 rounded-2xl text-xs font-black tracking-widest ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    VOLVER
                  </button>
                  <button onClick={handlePasswordChange} disabled={isChangingPass} className="flex-1 py-3.5 rounded-2xl text-xs font-black tracking-widest text-white bg-indigo-600 hover:bg-indigo-700">
                    {isChangingPass ? '...' : 'ACTUALIZAR'}
                  </button>
               </div>
             </div>
          </div>
        </div>
      )}

      <div className={`mt-8 p-6 rounded-[2rem] border italic text-center text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/10 text-indigo-400/30' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
        Si necesita cambios en su asignación académica, contacte a sistemas.
      </div>
    </div>
  );
}

// ── Simple Placeholder ────────────────────────────────────────────────────────
function Placeholder({ title, description }) {
  const { isDarkMode } = useTheme();
  return (
    <div className="p-4 md:p-6">
      <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
      <div className={`mt-8 text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-gray-800 text-gray-600' : 'border-gray-200 text-gray-400'}`}>
        Módulo en construcción
      </div>
    </div>
  );
}

// ── Main TeacherDashboard ─────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { isDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mainMargin = isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-20');

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
      <TeacherSidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(p => !p)} isMobile={isMobile} />

      {/* Mobile top bar */}
      {isMobile && (
        <div className={`fixed top-0 left-0 right-0 h-14 z-30 flex items-center px-4 border-b ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200'}`}>
          <button onClick={() => setSidebarOpen(true)} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}><Menu size={24} /></button>
          <span className={`ml-3 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Panel Docente</span>
        </div>
      )}

      <main className={`transition-all duration-300 ${mainMargin} ${isMobile ? 'pt-14' : ''}`}>
        <Routes>
          <Route path="/"          element={<TeacherHome />} />
          <Route path="/classes"   element={<Placeholder title="Mis Clases" description="Aquí verás las asignaturas asignadas a tu perfil." />} />
          <Route path="/groups"    element={<Placeholder title="Mis Grupos" description="Aquí podrás ver y gestionar tus grupos de alumnos." />} />
          <Route path="/results"   element={<TaskManagement />} />
          <Route path="/chat"      element={<TeacherChatRoom />} />
          <Route path="/messages"  element={<TeacherPrivateMessages />} />
          <Route path="/profile"   element={<TeacherProfile />} />
          <Route path="/exams"     element={<TaskManagement />} />
          <Route path="/exams/new" element={<ExamBuilder />} />
          <Route path="/exams/edit/:examId" element={<ExamEditPage />} />
          <Route path="/results/:examId" element={<ExamResultsPage />} />
        </Routes>
      </main>
    </div>
  );
}
