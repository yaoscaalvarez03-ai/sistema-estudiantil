import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/config';
import {
  collection, doc, getDoc, getDocs, query, where, onSnapshot, orderBy, updateDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  LayoutDashboard, User, Users, ClipboardList, TrendingUp,
  LogOut, Sun, Moon, Menu, X, ChevronLeft,
  BookOpen, Clock, ChevronRight, CheckCircle2, AlertCircle,
  GraduationCap, Calendar, MapPin, Phone, Mail, Award, Play, MessageSquare, MessageCircle, Edit2, Lock, Save
} from 'lucide-react';
import { functions } from '../firebase/config';
import GroupChat from './student/GroupChat';
import PrivateChat from './student/PrivateChat';

// ══════════════════════════════════════════════════════════════════════════════
// Sidebar
// ══════════════════════════════════════════════════════════════════════════════
function StudentSidebar({ isOpen, toggle, isMobile }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { name: 'Inicio',        icon: <LayoutDashboard size={20} />, path: '/student' },
    { name: 'Mi Perfil',     icon: <User size={20} />,            path: '/student/profile' },
    { name: 'Mi Grupo',      icon: <Users size={20} />,           path: '/student/group' },
    { name: 'Chat de Grupo', icon: <MessageSquare size={20} />,   path: '/student/chat' },
    { name: 'Mensajes Privados', icon: <MessageCircle size={20} />,path: '/student/chat/private' },
    { name: 'Exámenes',      icon: <ClipboardList size={20} />,   path: '/student/exams' },
    { name: 'Mis Notas',     icon: <TrendingUp size={20} />,      path: '/student/grades' },
  ];

  const isActive = (path) => path === '/student'
    ? location.pathname === '/student'
    : location.pathname.startsWith(path);

  const handleLogout = async () => { try { await logout(); navigate('/'); } catch (e) { console.error(e); } };

  const sidebarCls = `fixed top-0 left-0 h-full z-40 transition-all duration-300 flex flex-col
    ${isDarkMode ? 'bg-[#151c2c] border-r border-gray-800' : 'bg-white border-r border-gray-200'}
    ${isMobile ? (isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64') : (isOpen ? 'w-64' : 'w-20')}`;

  return (
    <>
      {isMobile && isOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={toggle} />}
      <aside className={sidebarCls}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 mt-2 mb-4 shrink-0">
          <div className={`flex items-center overflow-hidden transition-all duration-300 ${!isOpen && !isMobile ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-3 shrink-0 ${isDarkMode ? 'bg-[#0f172a] border border-cyan-500/40 text-cyan-400' : 'bg-indigo-600 text-white'}`}>E</div>
            <span className={`font-bold truncate text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Portal Estudiante</span>
          </div>
          {!isMobile && (
            <button onClick={toggle} className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}>
              {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
          )}
          {isMobile && <button onClick={toggle} className="text-gray-400"><X size={24} /></button>}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {items.map(item => (
            <button key={item.name} onClick={() => { navigate(item.path); if (isMobile) toggle(); }}
              className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all ${
                isActive(item.path)
                  ? (isDarkMode ? 'bg-[#007aff] text-white' : 'bg-indigo-600 text-white')
                  : (isDarkMode ? 'text-gray-400 hover:bg-gray-800/50 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600')
              }`}>
              <div className="shrink-0">{item.icon}</div>
              <span className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className={`px-3 pb-6 mt-4 pt-4 space-y-1 border-t ${isDarkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
          <button onClick={toggleTheme} className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400' : 'text-gray-600 hover:bg-gray-50'}`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Tema {isDarkMode ? 'Claro' : 'Oscuro'}</span>
          </button>
          <button onClick={handleLogout} className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all ${isDarkMode ? 'text-gray-400 hover:bg-red-500/10 hover:text-red-500' : 'text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
            <LogOut size={20} />
            <span className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Hook: load student full data
// ══════════════════════════════════════════════════════════════════════════════
function useStudentData(uid) {
  const [profile, setProfile]   = useState(null);
  const [group, setGroup]       = useState(null);
  const [exams, setExams]       = useState([]);
  const [results, setResults]   = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    async function load() {
      // 1. Profile
      const profSnap = await getDoc(doc(db, 'users', uid));
      const prof = profSnap.exists() ? { uid, ...profSnap.data() } : null;
      if (!cancelled) setProfile(prof);

      // 2. Group — resolve first; we need the group ID to filter exams
      let resolvedGroup = null;
      if (prof?.groupId) {
        const gSnap = await getDoc(doc(db, 'groups', prof.groupId));
        resolvedGroup = gSnap.exists() ? { id: gSnap.id, ...gSnap.data() } : null;
      } else {
        // Fallback: search groups where this student's uid is in studentIds
        const gQuery = query(collection(db, 'groups'), where('studentIds', 'array-contains', uid));
        const gSnap = await getDocs(gQuery);
        if (!gSnap.empty) resolvedGroup = { id: gSnap.docs[0].id, ...gSnap.docs[0].data() };
      }
      if (!cancelled) setGroup(resolvedGroup);

      // 3. Exams — only those assigned to the student's specific group.
      //    No group → no exams (student must be assigned to a group first).
      if (resolvedGroup) {
        const exSnap = await getDocs(
          query(
            collection(db, 'exams'),
            where('status', '==', 'active'),
            where('assignedGroups', 'array-contains', resolvedGroup.id)
          )
        );
        if (!cancelled) setExams(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        if (!cancelled) setExams([]);
      }

      // 4. Past exam results
      // 4. Past exam results - Handle both 'userId' (new) and 'studentId' (legacy)
      const resSnap = await getDocs(query(collection(db, 'exam_results'), where('userId', '==', uid)));
      let allResults = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Also check legacy 'studentId' just in case
      const legacySnap = await getDocs(query(collection(db, 'exam_results'), where('studentId', '==', uid)));
      legacySnap.docs.forEach(d => {
        if (!allResults.find(r => r.id === d.id)) {
          allResults.push({ id: d.id, ...d.data() });
        }
      });

      if (!cancelled) setResults(allResults);

      // 5. Exam overrides (to authorized retakes)
      const ovSnap = await getDocs(query(collection(db, 'exam_overrides'), where('userId', '==', uid)));
      if (!cancelled) setOverrides(ovSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [uid]);

  return { profile, group, exams, results, loading, overrides };
}

// ══════════════════════════════════════════════════════════════════════════════
// Home
// ══════════════════════════════════════════════════════════════════════════════
function StudentHome({ profile, group, exams, results, loading, overrides }) {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const card  = `rounded-3xl border p-6 ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const badge = (cls) => `inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cls}`;

  // Agrupar resultados por examen para obtener la "Nota Final" (último intento)
  const resultsByExam = (results || []).reduce((acc, r) => {
    if (r && r.examId) {
      if (!acc[r.examId]) acc[r.examId] = [];
      acc[r.examId].push(r);
    }
    return acc;
  }, {});

  // Obtener solo el último intento de cada examen para los resúmenes
  const latestResults = Object.values(resultsByExam).map(attempts => {
    return attempts.sort((a, b) => {
      const dateA = new Date(a.submittedAt?.toMillis ? a.submittedAt.toMillis() : (a.submittedAt || 0));
      const dateB = new Date(b.submittedAt?.toMillis ? b.submittedAt.toMillis() : (b.submittedAt || 0));
      return dateB - dateA;
    })[0];
  });

  const pendingExams = (exams || []).filter(e => {
    const hasResult = (results || []).find(r => r.examId === e.id);
    const hasOverride = (overrides || []).find(ov => ov.examId === e.id);
    return !hasResult || hasOverride;
  });

  const completedExams = latestResults.length;
  const avgScore = latestResults.length > 0 
    ? Math.round(latestResults.reduce((acc, r) => acc + (r.percentageScore ?? 0), 0) / latestResults.length) 
    : null;

  const scoreColor = (score) => {
    if (score <= 59) return isDarkMode ? 'text-red-400' : 'text-red-600';
    if (score <= 70) return isDarkMode ? 'text-amber-500' : 'text-amber-600';
    return isDarkMode ? 'text-green-400' : 'text-green-600';
  };

  const name = profile?.nombres ? `${profile.nombres} ${profile.apellidos}` : profile?.displayName || profile?.email || '—';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome banner */}
      <div className={`rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 ${isDarkMode ? 'bg-gradient-to-br from-[#007aff]/20 to-[#151c2c] border border-[#007aff]/30' : 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-200'}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 ${isDarkMode ? 'bg-[#007aff]/20 text-cyan-300' : 'bg-indigo-100 text-indigo-600'}`}>
          {name[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>¡Hola, {profile?.nombres || name}! 👋</h1>
          <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{profile?.carrera || 'Sin carrera asignada'} — {profile?.turno || 'Turno no asignado'}</p>
        </div>
        <div className="flex gap-3">
          <div className="text-center">
            <div className={`text-2xl font-black ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>{pendingExams.length}</div>
            <div className="text-xs text-gray-400">Pendientes</div>
          </div>
          <div className={`w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <div className="text-center">
            <div className={`text-2xl font-black ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{completedExams}</div>
            <div className="text-xs text-gray-400">Realizados</div>
          </div>
          {avgScore !== null && (
            <>
              <div className={`w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className="text-center">
                <div className={`text-2xl font-black ${scoreColor(avgScore)}`}>{avgScore}%</div>
                <div className="text-xs text-gray-400">Promedio</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Exams pending — 2 cols */}
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Exámenes Disponibles</h2>
            <button onClick={() => navigate('/student/exams')} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          {pendingExams.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 size={40} className="mx-auto text-green-400 mb-2" />
              <p className="text-sm text-gray-400">¡Sin exámenes pendientes por ahora!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingExams.slice(0, 4).map(exam => (
                <div key={exam.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.01] ${isDarkMode ? 'bg-[#0b1120] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <ClipboardList size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exam.title}</div>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {exam.timeLimit && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} /> {exam.timeLimit} min</span>}
                      {exam.questions && <span className="text-xs text-gray-400">{exam.questions.length} preguntas</span>}
                    </div>
                  </div>
                  <button onClick={() => navigate(`/exam/${exam.id}`)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    <Play size={12} /> Iniciar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group info — 1 col */}
        <div className={card}>
          <h2 className={`text-base font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mi Grupo</h2>
          {!group ? (
            <div className="text-center py-10">
              <Users size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No tienes grupo asignado aún.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Users size={18} />
                </div>
                <div>
                  <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{group.name}</div>
                  <div className="text-xs text-gray-400">{(group.studentIds || []).length} integrantes</div>
                </div>
              </div>
              {group.description && <p className="text-xs text-gray-400">{group.description}</p>}

              {/* Stacked avatars of classmates */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-semibold">Compañeros</p>
                <div className="flex -space-x-2">
                  {(group.studentIds || []).slice(0, 8).map((sid, i) => (
                    <div key={sid} style={{ zIndex: 10 - i }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isDarkMode ? 'bg-gray-700 text-gray-300 border-[#151c2c]' : 'bg-indigo-100 text-indigo-600 border-white'}`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  {(group.studentIds || []).length > 8 && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isDarkMode ? 'bg-gray-800 text-gray-400 border-[#151c2c]' : 'bg-gray-100 text-gray-500 border-white'}`}>
                      +{(group.studentIds || []).length - 8}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => navigate('/student/group')} className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Ver detalles del grupo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent results */}
      {results.length > 0 && (
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Últimas Calificaciones</h2>
            <button onClick={() => navigate('/student/grades')} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">Ver todas <ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {latestResults.slice(0, 3).map(r => {
              const pct = r.percentageScore ?? r.score ?? 0;
              const pass = pct >= 60;
              return (
                <div key={r.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#0b1120] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-xs font-semibold mb-2 truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{r.examTitle || 'Examen'}</div>
                  <div className={`text-3xl font-black mb-1 ${scoreColor(pct)}`}>{pct}%</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={badge(
                      pct <= 59 ? (isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700') :
                      pct <= 70 ? (isDarkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600') :
                      (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700')
                    )}>
                      {pct >= 60 ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />} {pct >= 60 ? 'Aprobado' : 'Reprobado'}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">Último intento</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Profile
// ══════════════════════════════════════════════════════════════════════════════
function StudentProfile({ profile, loading }) {
  const { isDarkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  const card = `rounded-3xl border p-6 ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const lbl  = `text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`;
  const val  = `text-sm font-bold mt-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`;
  const inp  = `w-full bg-transparent border-b py-1 text-sm font-bold outline-none transition-all ${isDarkMode ? 'border-gray-800 focus:border-cyan-500 text-white' : 'border-gray-200 focus:border-indigo-600 text-gray-900'}`;

  const name = profile?.nombres ? `${profile.nombres} ${profile.apellidos}` : profile?.displayName || '—';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        celular1: formData.celular1 || '',
        celular2: formData.celular2 || '',
        direccion: formData.direccion || '',
        genero: formData.genero || '',
        fechaNacimiento: formData.fechaNacimiento || '',
        cedula: formData.cedula || '',
        nombres: formData.nombres || '',
        apellidos: formData.apellidos || ''
      });
      setIsEditing(false);
      alert('¡Perfil actualizado!');
    } catch (e) {
      console.error(e);
      alert('Error actualizando perfil');
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
      alert('Contraseña cambiada con éxito');
      setShowPassModal(false);
      setNewPass('');
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    } finally {
      setIsChangingPass(false);
    }
  };

  const Field = ({ icon, label, field, value }) => {
    const isAlreadyFilled = profile && profile[field] && String(profile[field]).trim() !== '';

    return (
      <div className={`p-4 rounded-2xl transition-all ${isDarkMode ? 'bg-[#0b1120] border border-gray-800/50' : 'bg-gray-50 border border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-500">{icon}</span>
          <span className={lbl}>{label}</span>
        </div>
        {isEditing && !isAlreadyFilled ? (
          <input 
            className={inp} 
            value={formData[field] || ''} 
            onChange={e => setFormData({...formData, [field]: e.target.value})}
            placeholder="Rellenar..."
          />
        ) : (
          <div className={val}>{value || <span className="text-gray-500 italic font-normal">No registrado</span>}</div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mi Perfil</h1>
        <div className="flex gap-2">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
              <Edit2 size={14} /> Editar Perfil
            </button>
          ) : (
            <button onClick={handleSave} disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-green-600 hover:bg-green-700 disabled:opacity-50`}>
              <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          )}
          <button onClick={() => setShowPassModal(true)} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
            <Lock size={14} /> Seguridad
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className={`${card} relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black shrink-0 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
            {name[0]?.toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{name}</h2>
            <p className="text-gray-500 font-medium">{profile?.email}</p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
              {profile?.carrera && <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700'}`}>{profile.carrera}</span>}
              {profile?.turno && <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isDarkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-700'}`}>{profile.turno}</span>}
              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'}`}>{profile.estadoAlumno}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personales */}
        <div className={card}>
          <h3 className={`text-xs font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-900'}`}>Datos Personales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field icon={<User size={14} />} label="Nombres" field="nombres" value={profile?.nombres} />
            <Field icon={<User size={14} />} label="Apellidos" field="apellidos" value={profile?.apellidos} />
            <Field icon={<Award size={14} />} label="Identificación" field="cedula" value={profile?.cedula} />
            <Field icon={<Calendar size={14} />} label="Nacimiento" field="fechaNacimiento" value={profile?.fechaNacimiento} />
            <Field icon={<Phone size={14} />} label="Celular 1" field="celular1" value={profile?.celular1} />
            <Field icon={<Phone size={14} />} label="Celular 2" field="celular2" value={profile?.celular2} />
            <div className="sm:col-span-2">
              <Field icon={<MapPin size={14} />} label="Dirección" field="direccion" value={profile?.direccion} />
            </div>
          </div>
        </div>

        {/* Académicos (Solo lectura) */}
        <div className={card}>
          <h3 className={`text-xs font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-900'}`}>Expediente Académico</h3>
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl flex items-center justify-between ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <GraduationCap className="text-gray-500" size={20} />
                <div>
                  <div className={lbl}>Carrera / Facultad</div>
                  <div className={val}>{profile?.carrera || '---'}</div>
                </div>
              </div>
            </div>
            <div className={`p-5 rounded-2xl flex items-center justify-between ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <Clock className="text-gray-500" size={20} />
                <div>
                  <div className={lbl}>Turno asignado</div>
                  <div className={val}>{profile?.turno || '---'}</div>
                </div>
              </div>
            </div>
          </div>
          <div className={`mt-6 p-4 rounded-2xl text-[10px] font-medium italic ${isDarkMode ? 'bg-gray-800/20 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
            * Los datos académicos sólo pueden ser modificados por la administración.
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-[2.5rem] border p-8 shadow-2xl ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-100'}`}>
            <h2 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Cambiar Contraseña</h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">Ingrese su nueva clave de acceso. Se recomienda una combinación de letras y números.</p>
            
            <div className="space-y-4">
              <div>
                <label className={lbl}>Nueva Contraseña</label>
                <div className="relative mt-1">
                  <input 
                    type="password"
                    className={`w-full px-5 py-3.5 rounded-2xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-gray-800/50 border-gray-700 focus:border-cyan-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-indigo-600 text-gray-900'}`}
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    placeholder="Min. 6 caracteres"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowPassModal(false)} className={`flex-1 py-3.5 rounded-2xl text-xs font-black transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  CANCELAR
                </button>
                <button 
                  onClick={handlePasswordChange}
                  disabled={isChangingPass}
                  className="flex-1 py-3.5 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                >
                  {isChangingPass ? 'GUARDANDO...' : 'ACTUALIZAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Group Detail
// ══════════════════════════════════════════════════════════════════════════════
function StudentGroup({ group, loading }) {
  const { isDarkMode } = useTheme();
  const [members, setMembers] = useState([]);
  const card = `rounded-3xl border p-6 ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  useEffect(() => {
    if (!group?.studentIds?.length) return;
    getDocs(query(collection(db, 'users'), where('role', '==', 'student')))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMembers(all.filter(s => group.studentIds.includes(s.id)));
      });
  }, [group]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mi Grupo</h1>
      {!group ? (
        <div className={`${card} text-center py-16`}>
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className={`font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No tienes grupo asignado.</p>
          <p className="text-sm text-gray-500 mt-1">Contacta a tu administrador para ser asignado a un grupo.</p>
        </div>
      ) : (
        <>
          <div className={`${card} flex items-center gap-4`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Users size={26} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{group.name}</h2>
              {group.description && <p className="text-sm text-gray-400 mt-0.5">{group.description}</p>}
              <p className="text-xs text-gray-500 mt-1">{members.length} integrantes</p>
            </div>
          </div>

          <div className={card}>
            <h3 className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Compañeros de Grupo</h3>
            {members.length === 0 ? (
              <p className="text-sm text-gray-400">No hay compañeros registrados aún.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map(m => (
                  <div key={m.id} className={`flex items-center gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-indigo-100 text-indigo-600'}`}>
                      {(m.nombres || m.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {m.nombres ? `${m.nombres} ${m.apellidos}` : m.email}
                      </div>
                      {m.nombres && <div className="text-xs text-gray-400 truncate">{m.email}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Exams list
// ══════════════════════════════════════════════════════════════════════════════
function StudentExams({ exams, results, loading, overrides }) {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const card = `rounded-3xl border p-6 ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  const pending = (exams || []).filter(e => {
    const hasResult = (results || []).find(r => r.examId === e.id);
    const hasOverride = (overrides || []).find(ov => ov.examId === e.id);
    return !hasResult || hasOverride;
  });

  const completed = (exams || []).filter(e => {
    const hasResult = (results || []).find(r => r.examId === e.id);
    const hasOverride = (overrides || []).find(ov => ov.examId === e.id);
    return hasResult && !hasOverride;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  const ExamCard = ({ exam, done }) => {
    const result = results.find(r => r.examId === exam.id);
    return (
      <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${done ? 'opacity-75' : 'hover:scale-[1.01]'} ${isDarkMode ? 'bg-[#0b1120] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${done ? (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600') : (isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600')}`}>
          {done ? <CheckCircle2 size={22} /> : <ClipboardList size={22} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exam.title}</div>
          <div className="flex gap-3 mt-0.5 flex-wrap">
            {exam.timeLimit && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{exam.timeLimit} min</span>}
            {exam.questions  && <span className="text-xs text-gray-400">{exam.questions.length} preguntas</span>}
            {done && result   && (
              <span className={`text-xs font-bold ${
                (result.percentageScore ?? 0) <= 59 ? 'text-red-500' :
                (result.percentageScore ?? 0) <= 70 ? 'text-amber-500' :
                'text-green-500'
              }`}>
                Nota (último): {result.percentageScore ?? 0}%
              </span>
            )}
          </div>
        </div>
        {!done ? (
          <button onClick={() => navigate(`/exam/${exam.id}`)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            <Play size={12} /> Iniciar
          </button>
        ) : (
          <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700'}`}>✓ Completado</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Exámenes</h1>

      {exams.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <p className={`font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No hay exámenes disponibles.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className={card}>
              <h2 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <AlertCircle size={16} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} /> Pendientes ({pending.length})
              </h2>
              <div className="space-y-3">{pending.map(e => <ExamCard key={e.id} exam={e} done={false} />)}</div>
            </div>
          )}
          {completed.length > 0 && (
            <div className={card}>
              <h2 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <CheckCircle2 size={16} className={isDarkMode ? 'text-green-400' : 'text-green-600'} /> Realizados ({completed.length})
              </h2>
              <div className="space-y-3">{completed.map(e => <ExamCard key={e.id} exam={e} done={true} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Grades
// ══════════════════════════════════════════════════════════════════════════════
function StudentGrades({ results, loading }) {
  const { isDarkMode } = useTheme();
  const [expandedExam, setExpandedExam] = useState(null);
  const card = `rounded-3xl border p-6 ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  // Agrupar resultados por examen
  const resultsByExam = results.reduce((acc, r) => {
    if (!acc[r.examId]) acc[r.examId] = [];
    acc[r.examId].push(r);
    return acc;
  }, {});

  // Obtener solo el último intento de cada examen para los resúmenes
  const examsCalculated = Object.entries(resultsByExam).map(([examId, attempts]) => {
    const sorted = [...attempts].sort((a, b) => {
      const dateA = new Date(a.submittedAt?.toMillis ? a.submittedAt.toMillis() : (a.submittedAt || 0));
      const dateB = new Date(b.submittedAt?.toMillis ? b.submittedAt.toMillis() : (b.submittedAt || 0));
      return dateB - dateA;
    });
    return {
      examId,
      examTitle: sorted[0].examTitle || 'Examen',
      lastAttempt: sorted[0],
      history: sorted
    };
  }).sort((a, b) => {
    const dateA = new Date(a.lastAttempt.submittedAt?.toMillis ? a.lastAttempt.submittedAt.toMillis() : (a.lastAttempt.submittedAt || 0));
    const dateB = new Date(b.lastAttempt.submittedAt?.toMillis ? b.lastAttempt.submittedAt.toMillis() : (b.lastAttempt.submittedAt || 0));
    return dateB - dateA;
  });

  const avg = examsCalculated.length > 0 
    ? Math.round(examsCalculated.reduce((a, e) => a + (e.lastAttempt.percentageScore ?? 0), 0) / examsCalculated.length) 
    : null;
  
  const passed = examsCalculated.filter(e => (e.lastAttempt.percentageScore ?? 0) >= 60).length;

  const scoreColor = (score) => {
    if (score <= 59) return isDarkMode ? 'text-red-400' : 'text-red-600';
    if (score <= 70) return isDarkMode ? 'text-amber-500' : 'text-amber-600';
    return isDarkMode ? 'text-green-400' : 'text-green-600';
  };
  const scoreBg = (score) => {
    if (score <= 59) return isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700';
    if (score <= 70) return isDarkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600';
    return isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700';
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    if (ts.toDate) return ts.toDate().toLocaleDateString();
    if (ts.toMillis) return new Date(ts.toMillis()).toLocaleDateString();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (ts.toMillis) return new Date(ts.toMillis()).toLocaleString();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mis Calificaciones</h1>

      {examsCalculated.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <p className={`font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Aún no tienes calificaciones registradas.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Promedio General', value: avg !== null ? `${avg}%` : '—', cls: isDarkMode ? 'text-cyan-400' : 'text-indigo-600' },
              { label: 'Exámenes Aprobados', value: passed, cls: isDarkMode ? 'text-green-400' : 'text-green-600' },
              { label: 'Exámenes Reprobados', value: examsCalculated.length - passed, cls: isDarkMode ? 'text-red-400' : 'text-red-600' },
            ].map(s => (
              <div key={s.label} className={card}>
                <div className={`text-3xl font-black mb-1 ${s.cls}`}>{s.value}</div>
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {/* List of Exams Grouped */}
          <div className="space-y-4">
            {examsCalculated.map(examGroup => {
              const r = examGroup.lastAttempt;
              const pct = r.percentageScore ?? 0;
              const isExpanded = expandedExam === examGroup.examId;

              return (
                <div key={examGroup.examId} className={`${card} overflow-hidden transition-all duration-300`}>
                  <div 
                    className="flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedExam(isExpanded ? null : examGroup.examId)}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${scoreBg(pct)}`}>
                      {pct}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-lg font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{examGroup.examTitle}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-medium">
                         <span>Último intento: {formatDate(r.submittedAt || r.completedAt)}</span>
                         <span className="bg-gray-500/10 px-2 py-0.5 rounded-lg border border-gray-500/20">{examGroup.history.length} {examGroup.history.length === 1 ? 'intento' : 'intentos'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className={`text-xs font-bold px-4 py-2 rounded-xl border ${
                        pct <= 59 ? (isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200') :
                        pct <= 70 ? (isDarkMode ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200') :
                        (isDarkMode ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-100 text-green-700 border-green-200')
                      }`}>
                         {pct >= 60 ? 'APROBADO' : 'REPROBADO'}
                      </span>
                      <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-gray-500/10 text-cyan-400' : 'text-gray-500 hover:bg-gray-500/5'}`}>
                        {isExpanded ? <X size={20} /> : <ChevronRight size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* History Detail */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-gray-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest px-1">Historial del Examen</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {examGroup.history.map((attempt, idx) => {
                          return (
                            <div key={attempt.id} className={`flex items-center justify-between p-3.5 rounded-2xl border ${isDarkMode ? 'bg-[#0b1120] border-gray-800' : 'bg-gray-50 border-gray-200'} transition-all hover:border-gray-500/30`}>
                              <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${scoreBg(attempt.percentageScore ?? 0)}`}>
                                  {attempt.percentageScore ?? 0}%
                                </div>
                                <div>
                                  <div className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    Intento #{examGroup.history.length - idx}
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    {formatDateTime(attempt.submittedAt || attempt.completedAt)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${scoreBg(attempt.percentageScore ?? 0)}`}>
                                  {(attempt.percentageScore ?? 0) >= 60 ? 'PASA' : 'FALLA'}
                                </span>
                                {idx === 0 && (
                                  <span className="text-[9px] font-bold text-cyan-500 uppercase tracking-tighter">★ Nota Actual</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════
export default function StudentDashboard() {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { profile, group, exams, results, loading, overrides } = useStudentData(user?.uid);

  useEffect(() => {
    const handle = () => {
      const m = window.innerWidth < 768;
      setIsMobile(m);
      if (m) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handle);
    handle();
    return () => window.removeEventListener('resize', handle);
  }, []);

  const ml = isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-20');

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
      <StudentSidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(p => !p)} isMobile={isMobile} />

      {isMobile && (
        <div className={`fixed top-0 left-0 right-0 h-14 z-30 flex items-center px-4 border-b ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200'}`}>
          <button onClick={() => setSidebarOpen(true)} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}><Menu size={24} /></button>
          <span className={`ml-3 font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Portal Estudiante</span>
        </div>
      )}

      <main className={`transition-all duration-300 ${ml} ${isMobile ? 'pt-14' : ''}`}>
        <Routes>
          <Route path="/"        element={<StudentHome    profile={profile} group={group} exams={exams} results={results} loading={loading} overrides={overrides} />} />
          <Route path="/profile" element={<StudentProfile profile={profile} loading={loading} />} />
          <Route path="/group"   element={<StudentGroup   group={group}   loading={loading} />} />
          <Route path="/chat"    element={<GroupChat    group={group}   profile={profile} />} />
          <Route path="/chat/private" element={<PrivateChat profile={profile} group={group} />} />
          <Route path="/exams"   element={<StudentExams   exams={exams}   results={results} loading={loading} overrides={overrides} />} />
          <Route path="/grades"  element={<StudentGrades  results={results} loading={loading} />} />
        </Routes>
      </main>
    </div>
  );
}
