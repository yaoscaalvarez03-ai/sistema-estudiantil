import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, orderBy, query, updateDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Trash2, Clock, BarChart2, Hash, ChevronRight,
  ClipboardList, Edit2, Power, Users, X, CheckCircle
} from 'lucide-react';

// ── Assign-to-group modal ────────────────────────────────────────────────────
function AssignModal({ exam, groups, onClose, onSave, isDarkMode }) {
  const [selectedGroupIds, setSelectedGroupIds] = useState(exam.assignedGroups || []);
  const [saving, setSaving] = useState(false);

  const toggle = (id) => setSelectedGroupIds(p =>
    p.includes(id) ? p.filter(g => g !== id) : [...p, id]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'exams', exam.id), { assignedGroups: selectedGroupIds });
      onSave();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const input = `w-full p-3 rounded-xl text-sm border focus:outline-none transition-all ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className={`w-full max-w-md rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
        <div className="flex items-center justify-between p-8 pb-4">
          <div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Asignar a Grupos</h3>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{exam.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={22} /></button>
        </div>

        <div className="px-8 max-h-72 overflow-y-auto space-y-2">
          {groups.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No hay grupos creados. Ve al módulo de Grupos para crear uno.</p>
          ) : groups.map(g => {
            const selected = selectedGroupIds.includes(g.id);
            return (
              <button key={g.id} type="button" onClick={() => toggle(g.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all border ${selected
                  ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-indigo-50 border-indigo-300')
                  : (isDarkMode ? 'border-gray-800 hover:border-gray-700' : 'border-gray-200 hover:border-gray-300')}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Users size={18} />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{g.name}</div>
                  <div className="text-xs text-gray-400">{(g.studentIds || []).length} alumnos</div>
                </div>
                {selected && <CheckCircle size={18} className={isDarkMode ? 'text-cyan-400' : 'text-indigo-600'} />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 p-8 pt-6">
          <button onClick={onClose} className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-gray-500 hover:bg-gray-100'}`}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className={`flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {saving ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TaskManagement() {
  const { user, role } = useAuth();
  const [exams, setExams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(null); // exam being assigned
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, 'exams'), orderBy('createdAt', 'desc')), snap => {
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter for teachers
      if (role === 'teacher') {
        const myGroupIds = groups.map(g => g.id);
        docs = docs.filter(ex => 
          ex.teacherId === user.uid || 
          (ex.assignedGroups && ex.assignedGroups.some(gid => myGroupIds.includes(gid)))
        );
      }
      
      setExams(docs);
      setLoading(false);
    });
    return () => unsub();
  }, [role, user?.uid, groups]);

  useEffect(() => {
    if (!user) return;
    const q = role === 'teacher' 
      ? query(collection(db, 'groups'), where('teacherId', '==', user.uid))
      : collection(db, 'groups');

    getDocs(q).then(snap =>
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [role, user?.uid]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este examen? Esta acción no se puede deshacer.')) return;
    try { await deleteDoc(doc(db, 'exams', id)); }
    catch (e) { console.error(e); }
  };

  const handleToggleStatus = async (exam) => {
    const next = exam.status === 'active' ? 'disabled' : 'active';
    try { await updateDoc(doc(db, 'exams', exam.id), { status: next }); }
    catch (e) { console.error(e); }
  };

  const card = `rounded-3xl border transition-all ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tareas y Pruebas</h2>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Crea y gestiona los exámenes de tus clases.</p>
        </div>
        <button onClick={() => navigate('/admin/tasks/new')}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          <Plus size={18} /> Nuevo Examen
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" /></div>
      ) : exams.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <p className={`font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Todavía no hay exámenes creados</p>
          <p className="text-sm text-gray-500">Presiona "Nuevo Examen" para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {exams.map(exam => {
            const isDisabled = exam.status === 'disabled';
            const assignedNames = (exam.assignedGroups || [])
              .map(gid => groups.find(g => g.id === gid)?.name)
              .filter(Boolean);

            return (
              <div key={exam.id} className={`${card} p-6 flex flex-col ${isDisabled ? 'opacity-60' : ''}`}>
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isDisabled ? (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400') : (isDarkMode ? 'bg-[#007aff]/10 text-[#007aff]' : 'bg-indigo-100 text-indigo-600')}`}>
                    <ClipboardList size={22} />
                  </div>
                  {/* Status badge */}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isDisabled ? (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400') : (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700')}`}>
                    {isDisabled ? 'Deshabilitado' : 'Activo'}
                  </span>
                </div>

                <h3 className={`text-lg font-bold leading-snug mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exam.title}</h3>
                {exam.description && <p className={`text-xs mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{exam.description}</p>}

                {/* Stats */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    <Hash size={11} /> {exam.questions?.length || 0} preg.
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    <Clock size={11} /> {exam.timeLimitMinutes ? `${exam.timeLimitMinutes} min` : '∞'}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    <BarChart2 size={11} /> {exam.questions?.reduce((s, q) => s + (q.points || 1), 0) || 0} pts
                  </span>
                </div>

                {/* Assigned groups */}
                {assignedNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {assignedNames.map(n => (
                      <span key={n} className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                        <Users size={10} /> {n}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-auto pt-3 space-y-2">
                  {/* Row 1: Assign + Results */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setAssignModal(exam)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                      <Users size={14} /> Asignar
                    </button>
                    <button onClick={() => {
                      const base = location.pathname.startsWith('/admin') ? '/admin/tasks/results' : '/teacher/results';
                      navigate(`${base}/${exam.id}`);
                    }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}>
                      <BarChart2 size={14} /> Resultados
                    </button>
                  </div>
                  {/* Row 2: Edit + Toggle + Delete */}
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => {
                      const base = location.pathname.startsWith('/admin') ? '/admin/tasks/edit' : '/teacher/exams/edit';
                      navigate(`${base}/${exam.id}`);
                    }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      <Edit2 size={13} /> Editar
                    </button>
                    <button onClick={() => handleToggleStatus(exam)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDisabled
                        ? (isDarkMode ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100')
                        : (isDarkMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100')}`}>
                      <Power size={13} /> {isDisabled ? 'Activar' : 'Pausar'}
                    </button>
                    <button onClick={() => handleDelete(exam.id)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <AssignModal
          exam={assignModal}
          groups={groups}
          isDarkMode={isDarkMode}
          onClose={() => setAssignModal(null)}
          onSave={() => setAssignModal(null)}
        />
      )}
    </div>
  );
}
