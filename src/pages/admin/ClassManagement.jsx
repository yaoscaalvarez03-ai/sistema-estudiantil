import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  setDoc,
  deleteDoc, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  X, 
  BookOpen, 
  User, 
  Users, 
  Hash, 
  Trash2,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sectionCode: '',
    teacherId: '',
    studentIds: [] // Array of student IDs
  });

  useEffect(() => {
    // 1. Fetch Classes
    const unsubscribeClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // 2. Fetch Teachers
    const qTeachers = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const unsubscribeTeachers = onSnapshot(qTeachers, (snapshot) => {
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Fetch Students
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeClasses();
      unsubscribeTeachers();
      unsubscribeStudents();
    };
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.teacherId) return alert('Nombre y Docente son obligatorios');
    
    setIsSubmitting(true);
    try {
      const teacher = teachers.find(t => t.id === formData.teacherId);
      
      await addDoc(collection(db, 'classes'), {
        ...formData,
        teacherName: teacher?.displayName || 'Sin nombre',
        createdAt: serverTimestamp(),
      });
      
      setShowModal(false);
      setFormData({ name: '', sectionCode: '', teacherId: '', studentIds: [] });
    } catch (error) {
      console.error("Error creating class:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta clase?")) return;
    try {
      await deleteDoc(doc(db, 'classes', id));
    } catch (error) {
      console.error("Error deleting class:", error);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setFormData(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : [...prev.studentIds, studentId]
    }));
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Gestión de Clases</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Organiza las asignaturas, asigna docentes y vincula a los estudiantes.</p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${
            isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          <Plus size={18} className="mr-2" />
          Crear Nueva Clase
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : classes.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No se han creado clases todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div 
              key={cls.id} 
              className={`p-6 rounded-3xl border transition-all hover:shadow-xl relative group ${
                isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200'
              }`}
            >
              <button 
                onClick={() => handleDeleteClass(cls.id)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>

              <div className="flex items-center mb-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                   isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-indigo-100 text-indigo-600'
                 }`}>
                   <BookOpen size={20} />
                 </div>
                 <div className="ml-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{cls.sectionCode || 'SIN CÓDIGO'}</span>
                    <h3 className={`font-bold text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cls.name}</h3>
                 </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                 <div className="flex items-center text-sm text-gray-500">
                    <User size={14} className="mr-2 shrink-0" />
                    <span className="truncate">Docente: <strong className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{cls.teacherName}</strong></span>
                 </div>
                 <div className="flex items-center text-sm text-gray-500">
                    <Users size={14} className="mr-2 shrink-0" />
                    <span>Estudiantes: <strong className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{cls.studentIds?.length || 0}</strong></span>
                 </div>
              </div>

              <div className="mt-6 flex justify-end">
                 <button className={`text-xs font-bold flex items-center hover:underline ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>
                    Ver detalles <ChevronRight size={14} className="ml-0.5" />
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`w-full max-w-2xl p-8 rounded-[2rem] shadow-2xl relative transition-all ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
             <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-gray-300">
                <X size={24} />
             </button>
             
             <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Configurar Nueva Clase</h2>
             
             <form onSubmit={handleCreateClass} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre de la Materia</label>
                    <input 
                      type="text" required 
                      value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ej. Matemáticas I" 
                      className={`w-full p-3.5 rounded-2xl text-sm focus:outline-none transition-all ${
                        isDarkMode ? 'bg-[#0b1120] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                      } border shadow-sm`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Código de Grupo / Sección</label>
                    <input 
                      type="text"
                      value={formData.sectionCode} onChange={(e) => setFormData({...formData, sectionCode: e.target.value})}
                      placeholder="Ej. MAT-101-A" 
                      className={`w-full p-3.5 rounded-2xl text-sm focus:outline-none transition-all ${
                        isDarkMode ? 'bg-[#0b1120] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                      } border shadow-sm`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Docente Asignado</label>
                  <select 
                    required
                    value={formData.teacherId} onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                    className={`w-full p-3.5 rounded-2xl text-sm focus:outline-none transition-all appearance-none ${
                      isDarkMode ? 'bg-[#0b1120] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                    } border shadow-sm`}
                  >
                    <option value="">Selecciona un profesor...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.displayName} ({t.email})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                    <span>Vincular Estudiantes</span>
                    <span className="text-indigo-500">{formData.studentIds.length} seleccionados</span>
                  </label>
                  <div className={`max-h-48 overflow-y-auto rounded-2xl border p-2 space-y-1 ${
                    isDarkMode ? 'bg-[#0b1120] border-gray-800' : 'bg-gray-50 border-gray-200'
                  }`}>
                    {students.map(s => (
                      <div 
                        key={s.id}
                        onClick={() => toggleStudentSelection(s.id)}
                        className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors ${
                          formData.studentIds.includes(s.id)
                            ? (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-indigo-100 text-indigo-700 border border-indigo-200')
                            : (isDarkMode ? 'hover:bg-gray-800/50 text-gray-400' : 'hover:bg-white text-gray-600')
                        }`}
                      >
                         <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-3 ${
                            formData.studentIds.includes(s.id) ? 'bg-indigo-500 text-white' : 'bg-gray-300'
                         }`}>
                           {formData.studentIds.includes(s.id) && <Plus size={14} className="rotate-45" />}
                         </div>
                         <div className="text-sm font-medium">{s.displayName}</div>
                      </div>
                    ))}
                    {students.length === 0 && <div className="text-center py-4 text-xs text-gray-500">No hay estudiantes activos para asignar.</div>}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                    type="submit" disabled={isSubmitting}
                    className={`flex-1 py-4 rounded-2xl text-sm font-bold text-white shadow-xl transition-all disabled:opacity-50 ${
                      isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                   >
                     {isSubmitting ? 'Guardando...' : 'Crear y Publicar Clase'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
