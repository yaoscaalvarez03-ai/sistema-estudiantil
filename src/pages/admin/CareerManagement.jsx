import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, orderBy, query
} from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { BookOpen, Plus, Trash2, X, Edit2, Power } from 'lucide-react';

export default function CareerManagement() {
  const { isDarkMode } = useTheme();
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCareer, setEditingCareer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'careers'), orderBy('createdAt', 'desc')),
      snap => { setCareers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const openCreate = () => {
    setEditingCareer(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditingCareer(c);
    setFormData({ name: c.name, description: c.description || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return alert('La carrera necesita un nombre.');
    setSaving(true);
    try {
      const payload = { name: formData.name.trim(), description: formData.description.trim(), updatedAt: new Date().toISOString() };
      if (editingCareer) {
        await updateDoc(doc(db, 'careers', editingCareer.id), payload);
      } else {
        await addDoc(collection(db, 'careers'), { ...payload, status: 'active', createdAt: new Date().toISOString() });
      }
      setShowModal(false);
    } catch (e) { console.error(e); alert('Error al guardar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta carrera?')) return;
    try { await deleteDoc(doc(db, 'careers', id)); }
    catch (e) { console.error(e); }
  };

  const handleToggleStatus = async (career) => {
    const next = career.status === 'active' ? 'inactive' : 'active';
    try { await updateDoc(doc(db, 'careers', career.id), { status: next }); }
    catch (e) { console.error(e); }
  };

  const card = `rounded-3xl border transition-all ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `w-full p-3 rounded-xl text-sm border focus:outline-none transition-all ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
  const label = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carreras</h2>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestiona las carreras disponibles en el sistema.</p>
        </div>
        <button onClick={openCreate}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          <Plus size={18} /> Nueva Carrera
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" /></div>
      ) : careers.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className={`font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No hay carreras creadas</p>
          <p className="text-sm text-gray-500">Presiona "Nueva Carrera" para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {careers.map(c => {
            const isInactive = c.status === 'inactive';
            return (
              <div key={c.id} className={`${card} p-6 ${isInactive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <BookOpen size={20} />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isInactive ? (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400') : (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700')}`}>
                    {isInactive ? 'Inactiva' : 'Activa'}
                  </span>
                </div>
                <h3 className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{c.name}</h3>
                {c.description && <p className={`text-xs mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{c.description}</p>}
                <div className="flex gap-2 mt-auto pt-3">
                  <button onClick={() => openEdit(c)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <Edit2 size={13} /> Editar
                  </button>
                  <button onClick={() => handleToggleStatus(c)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isInactive ? (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600') : (isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')}`}>
                    <Power size={13} /> {isInactive ? 'Activar' : 'Pausar'}
                  </button>
                  <button onClick={() => handleDelete(c.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`w-full max-w-md rounded-[2rem] shadow-2xl p-8 ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{editingCareer ? 'Editar Carrera' : 'Nueva Carrera'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-200"><X size={22} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={label}>Nombre de la Carrera</label>
                <input type="text" className={input} placeholder="Ej. Ingeniería en Sistemas"
                  value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Descripción (opcional)</label>
                <textarea rows={2} className={`${input} resize-none`} placeholder="Descripción breve..."
                  value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowModal(false)}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-gray-500 hover:bg-gray-100'}`}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {saving ? 'Guardando...' : editingCareer ? 'Guardar Cambios' : 'Crear Carrera'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
