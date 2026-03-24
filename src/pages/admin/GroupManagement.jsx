import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, where, getDocs
} from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import * as XLSX from 'xlsx';
import {
  Users, Plus, Trash2, X, Edit2, UserPlus, Search,
  ClipboardCheck, Download, History, ChevronLeft, Save, AlertCircle, FileSpreadsheet
} from 'lucide-react';

// ── XLSX Export ───────────────────────────────────────────────────────────────
function exportAttendanceXLSX(groupName, date, records) {
  const data = records.map(r => ({
    'Nombre':      r.studentName || '',
    'Email':       r.email || '',
    'Asistencia':  r.present ? 'Presente' : (r.justified ? 'Justificado' : 'Ausente'),
    'Justificación': r.justification || '',
    'Fecha':       date,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
  XLSX.writeFile(wb, `Asistencia_${groupName}_${date}.xlsx`);
}

// ══════════════════════════════════════════════════════════════════════════════
// AttendanceModal — Pasar nueva asistencia
// ══════════════════════════════════════════════════════════════════════════════
function AttendanceModal({ group, students, isDarkMode, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState(() => {
    const uniqueIds = [...new Set(group.studentIds || [])];
    return uniqueIds
      .map(id => {
        const s = students.find(x => x.id === id);
        if (!s) return null;
        const rawName = s.nombres ? `${s.nombres} ${s.apellidos}` : (s.displayName || s.email);
        return { 
          studentId: id, 
          studentName: rawName.trim(), // Normalize: trim leading/trailing spaces
          email: s.email || '', 
          present: false, 
          justified: false, 
          justification: '' 
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openJustify, setOpenJustify] = useState(null); // studentId

  const toggle = (id) => setRecords(p => p.map(r => r.studentId === id ? { ...r, present: !r.present, justified: false, justification: '' } : r));
  const setJustified = (id, val) => setRecords(p => p.map(r => r.studentId === id ? { ...r, justified: val } : r));
  const setJustification = (id, val) => setRecords(p => p.map(r => r.studentId === id ? { ...r, justification: val } : r));

  const presentCount  = records.filter(r => r.present).length;
  const justifiedCount = records.filter(r => !r.present && r.justified).length;
  const absentCount   = records.filter(r => !r.present && !r.justified).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'attendance'), {
        groupId: group.id, groupName: group.name, date,
        records, createdAt: new Date().toISOString(),
      });
      setSaved(true);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const inp = `w-full p-3 rounded-xl text-sm border focus:outline-none transition-all ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-gray-200 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className={`w-full max-w-lg flex flex-col max-h-[90vh] rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-4 shrink-0">
          <div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pasar Asistencia</h3>
            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{group.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={22} /></button>
        </div>

        {/* Date */}
        <div className="px-8 mb-4 shrink-0">
          <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fecha</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
        </div>

        {/* Summary */}
        <div className={`mx-8 mb-4 p-3 rounded-2xl grid grid-cols-3 text-center text-xs font-bold shrink-0 ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
          <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>✓ Presentes<br />{presentCount}</span>
          <span className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>📋 Justificados<br />{justifiedCount}</span>
          <span className={isDarkMode ? 'text-red-400' : 'text-red-500'}>✗ Ausentes<br />{absentCount}</span>
        </div>

        {/* List */}
        <div className="px-8 overflow-y-auto flex-1 space-y-2 pb-2">
          {records.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No hay alumnos en este grupo.</p>}
          {records.map(r => (
            <div key={r.studentId} className={`rounded-2xl border transition-all ${
              r.present
                ? (isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200')
                : r.justified
                  ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')
                  : (isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')
            }`}>
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {(r.studentName || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{r.studentName}</div>
                  <div className="text-xs text-gray-400 truncate">{r.email}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!r.present && (
                    <button onClick={() => setOpenJustify(openJustify === r.studentId ? null : r.studentId)}
                      className={`p-1.5 rounded-lg text-xs transition-all ${r.justified ? (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700') : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}`}
                      title="Justificar ausencia">
                      <AlertCircle size={14} />
                    </button>
                  )}
                  <button onClick={() => toggle(r.studentId)}
                    className={`text-xs font-black px-2.5 py-1.5 rounded-full transition-all ${
                      r.present
                        ? (isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                        : r.justified
                          ? (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                          : (isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
                    }`}>
                    {r.present ? 'Presente' : r.justified ? 'Justificado' : 'Ausente'}
                  </button>
                </div>
              </div>
              {/* Justify panel */}
              {openJustify === r.studentId && !r.present && (
                <div className="px-4 pb-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={`jc-${r.studentId}`} checked={r.justified} onChange={e => setJustified(r.studentId, e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded" />
                    <label htmlFor={`jc-${r.studentId}`} className={`text-xs font-semibold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>Marcar como justificado</label>
                  </div>
                  {r.justified && (
                    <textarea rows={2} className={`${inp} resize-none text-xs`} placeholder="Motivo de la justificación..."
                      value={r.justification} onChange={e => setJustification(r.studentId, e.target.value)} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-8 pt-4 shrink-0 space-y-3">
          {saved && <p className="text-center text-xs text-green-500 font-semibold">✓ Asistencia guardada correctamente</p>}
          <div className="grid grid-cols-3 gap-3">
            <button onClick={onClose} className={`py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-gray-500 hover:bg-gray-100'}`}>
              Cerrar
            </button>
            <button onClick={() => exportAttendanceXLSX(group.name, date, records)}
              className={`flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
              <Download size={15} /> Excel
            </button>
            <button onClick={handleSave} disabled={saving || saved}
              className={`py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HistoryModal — Ver y editar registros pasados
// ══════════════════════════════════════════════════════════════════════════════
function HistoryModal({ group, isDarkMode, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);  // full attendance doc

  useEffect(() => {
    getDocs(query(collection(db, 'attendance'), where('groupId', '==', group.id), orderBy('date', 'desc')))
      .then(snap => { 
        setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        setLoading(false); 
      })
      .catch(err => {
        console.error("Attendance history error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [group.id]);

  const handleExport = (rec) => exportAttendanceXLSX(rec.groupName, rec.date, rec.records || []);

  const handleDelete = (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este registro de asistencia?")) {
      setDeletingId(id);
      deleteDoc(doc(db, 'attendance', id))
        .then(() => {
          setRecords(prev => prev.filter(r => r.id !== id));
          setDeletingId(null);
        })
        .catch(err => {
          console.error("Delete error:", err);
          alert("Error al eliminar");
          setDeletingId(null);
        });
    }
  };

  if (viewRecord) return (
    <EditAttendanceModal
      record={viewRecord}
      isDarkMode={isDarkMode}
      onClose={() => setViewRecord(null)}
      onSaved={(updated) => {
        setRecords(p => p.map(r => r.id === updated.id ? updated : r));
        setViewRecord(null);
      }}
    />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className={`w-full max-w-lg flex flex-col max-h-[85vh] rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
        <div className="flex items-center justify-between p-8 pb-4 shrink-0">
          <div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Historial de Asistencia</h3>
            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{group.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={22} /></button>
        </div>

        <div className="px-8 overflow-y-auto flex-1 space-y-3 pb-6">
          {loading ? (
            <div className="text-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" /></div>
          ) : error ? (
            <div className="text-center py-10 px-4">
              <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
              <p className="text-sm text-red-500 font-bold mb-2">Error al cargar historial</p>
              <p className="text-[10px] text-gray-500 line-clamp-3 mb-4">{error}</p>
              {error.includes('index') && (
                <p className="text-[9px] bg-red-500/10 text-red-400 p-2 rounded-lg">
                  Falta un índice en Firestore. Revisa la consola o espera a que el sistema se sincronice.
                </p>
              )}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-10">
              <History size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">No hay asistencias registradas aún.</p>
            </div>
          ) : records.map(rec => {
            const recs = rec.records || [];
            const present  = recs.filter(r => r.present).length;
            const justified = recs.filter(r => !r.present && r.justified).length;
            const absent   = recs.filter(r => !r.present && !r.justified).length;
            return (
              <div key={rec.id} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-gray-800 bg-[#0b1120]' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rec.date}</div>
                    <div className="text-xs text-gray-400">{recs.length} alumnos</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setViewRecord(rec)} title="Ver / Editar"
                      className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleExport(rec)} title="Descargar Excel"
                      className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}>
                      <FileSpreadsheet size={14} />
                    </button>
                    <button onClick={() => handleDelete(rec.id)} disabled={deletingId === rec.id} title="Eliminar registro"
                      className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}>
                      {deletingId === rec.id ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-500" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 text-xs font-bold">
                  <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>✓ {present} presentes</span>
                  <span className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>📋 {justified} justificados</span>
                  <span className={isDarkMode ? 'text-red-400' : 'text-red-500'}>✗ {absent} ausentes</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EditAttendanceModal — Editar un registro de asistencia existente
// ══════════════════════════════════════════════════════════════════════════════
function EditAttendanceModal({ record, isDarkMode, onClose, onSaved }) {
  const [records, setRecords] = useState(record.records || []);
  const [date, setDate] = useState(record.date);
  const [saving, setSaving] = useState(false);
  const [openJustify, setOpenJustify] = useState(null);

  const inp = `w-full p-3 rounded-xl text-sm border focus:outline-none transition-all ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-gray-200 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;

  const toggle = (id) => setRecords(p => p.map(r => r.studentId === id ? { ...r, present: !r.present, justified: false, justification: '' } : r));
  const setJustified = (id, val) => setRecords(p => p.map(r => r.studentId === id ? { ...r, justified: val } : r));
  const setJustification = (id, val) => setRecords(p => p.map(r => r.studentId === id ? { ...r, justification: val } : r));

  const presentCount   = records.filter(r => r.present).length;
  const justifiedCount = records.filter(r => !r.present && r.justified).length;
  const absentCount    = records.filter(r => !r.present && !r.justified).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'attendance', record.id), { records, date, updatedAt: new Date().toISOString() });
      onSaved({ ...record, records, date });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`w-full max-w-lg flex flex-col max-h-[90vh] rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
        <div className="flex items-center justify-between p-8 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <ChevronLeft size={20} />
            </button>
            <div>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Editar Asistencia</h3>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="text-sm text-gray-400 bg-transparent border-0 focus:outline-none cursor-pointer" />
            </div>
          </div>
          <button onClick={() => exportAttendanceXLSX(record.groupName, date, records)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
            <Download size={13} /> .xlsx
          </button>
        </div>

        {/* Summary */}
        <div className={`mx-8 mb-4 p-3 rounded-2xl grid grid-cols-3 text-center text-xs font-bold shrink-0 ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
          <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>✓ Presentes<br />{presentCount}</span>
          <span className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>📋 Justificados<br />{justifiedCount}</span>
          <span className={isDarkMode ? 'text-red-400' : 'text-red-500'}>✗ Ausentes<br />{absentCount}</span>
        </div>

        <div className="px-8 overflow-y-auto flex-1 space-y-2 pb-2">
          {records.map(r => (
            <div key={r.studentId} className={`rounded-2xl border transition-all ${
              r.present
                ? (isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200')
                : r.justified
                  ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')
                  : (isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')
            }`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {(r.studentName || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{r.studentName}</div>
                  {r.justification && <div className="text-xs text-amber-400 truncate">{r.justification}</div>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!r.present && (
                    <button onClick={() => setOpenJustify(openJustify === r.studentId ? null : r.studentId)}
                      className={`p-1.5 rounded-lg transition-all ${r.justified ? (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700') : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                      <AlertCircle size={14} />
                    </button>
                  )}
                  <button onClick={() => toggle(r.studentId)}
                    className={`text-xs font-black px-2.5 py-1.5 rounded-full transition-all ${
                      r.present
                        ? (isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                        : r.justified
                          ? (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                          : (isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
                    }`}>
                    {r.present ? 'Presente' : r.justified ? 'Justificado' : 'Ausente'}
                  </button>
                </div>
              </div>
              {openJustify === r.studentId && !r.present && (
                <div className="px-4 pb-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={`ej-${r.studentId}`} checked={r.justified} onChange={e => setJustified(r.studentId, e.target.checked)} className="w-4 h-4 accent-amber-500 rounded" />
                    <label htmlFor={`ej-${r.studentId}`} className={`text-xs font-semibold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>Justificado</label>
                  </div>
                  {r.justified && (
                    <textarea rows={2} className={`${inp} resize-none text-xs`} placeholder="Motivo de la justificación..."
                      value={r.justification || ''} onChange={e => setJustification(r.studentId, e.target.value)} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 p-8 pt-4 shrink-0">
          <button onClick={onClose} className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-gray-500 hover:bg-gray-100'}`}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            <Save size={15} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main GroupManagement
// ══════════════════════════════════════════════════════════════════════════════
export default function GroupManagement() {
  const { isDarkMode } = useTheme();
  const [groups, setGroups]       = useState([]);
  const [students, setStudents]   = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditing] = useState(null);
  const [attendGroup, setAttend]  = useState(null);
  const [historyGroup, setHistory] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [studentSearch, setSearch] = useState('');
  const [formData, setForm]       = useState({ name: '', description: '', studentIds: [], teacherId: '' });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'groups'), orderBy('createdAt', 'desc')),
      snap => { setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    // Real-time sync for students
    const unsubStudents = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'student')),
      snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // Real-time sync for teachers
    const unsubTeachers = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'teacher')),
      snap => setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubStudents(); unsubTeachers(); };
  }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', studentIds: [], teacherId: '' }); setSearch(''); setShowModal(true); };
  const openEdit   = (g)  => { setEditing(g); setForm({ name: g.name, description: g.description || '', studentIds: g.studentIds || [], teacherId: g.teacherId || '' }); setSearch(''); setShowModal(true); };
  const toggle     = (id) => setForm(p => ({ ...p, studentIds: p.studentIds.includes(id) ? p.studentIds.filter(s => s !== id) : [...p.studentIds, id] }));

  const handleSave = async () => {
    if (!formData.name.trim()) return alert('El grupo necesita un nombre.');
    setSaving(true);
    try {
      const payload = { 
        name: formData.name.trim(), 
        description: formData.description.trim(), 
        // Only keep IDs of students that actually exist, and ensure they are sorted for consistency
        studentIds: [...new Set(formData.studentIds)]
          .filter(id => students.find(s => s.id === id))
          .sort((a, b) => {
            const sA = students.find(x => x.id === a);
            const sB = students.find(x => x.id === b);
            const nameA = (sA.nombres ? `${sA.nombres} ${sA.apellidos}` : (sA.displayName || sA.email)).trim();
            const nameB = (sB.nombres ? `${sB.nombres} ${sB.apellidos}` : (sB.displayName || sB.email)).trim();
            return nameA.localeCompare(nameB);
          }),
        teacherId: formData.teacherId,
        updatedAt: new Date().toISOString() 
      };
      if (editingGroup) await updateDoc(doc(db, 'groups', editingGroup.id), payload);
      else await addDoc(collection(db, 'groups'), { ...payload, createdAt: new Date().toISOString() });
      setShowModal(false);
    } catch (e) { console.error(e); alert('Error al guardar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este grupo?')) return;
    try { await deleteDoc(doc(db, 'groups', id)); } catch (e) { console.error(e); }
  };

  const filteredStudents = students.filter(s =>
    `${s.nombres || ''} ${s.apellidos || ''} ${s.email}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const card = `rounded-3xl border transition-all ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const inp  = `w-full p-3 rounded-xl text-sm border focus:outline-none transition-all ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
  const lbl  = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Grupos</h2>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Organiza alumnos y gestiona la asistencia por grupo.</p>
        </div>
        <button onClick={openCreate}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          <Plus size={18} /> Nuevo Grupo
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" /></div>
      ) : groups.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className={`font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No hay grupos creados</p>
          <p className="text-sm text-gray-500">Presiona "Nuevo Grupo" para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {groups.map(g => {
            const memberStudents = (g.studentIds || [])
      .map(id => students.find(s => s.id === id))
      .filter(Boolean)
      .sort((a, b) => {
        const nameA = (a.nombres ? `${a.nombres} ${a.apellidos}` : (a.displayName || a.email)).trim();
        const nameB = (b.nombres ? `${b.nombres} ${b.apellidos}` : (b.displayName || b.email)).trim();
        return nameA.localeCompare(nameB);
      });
            return (
              <div key={g.id} className={`${card} p-6 flex flex-col gap-4`}>
                {/* Top */}
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <Users size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-base leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{g.name}</h3>
                    {g.description && <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{g.description}</p>}
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700'}`}>
                        Docente: {teachers.find(t => t.id === g.teacherId)?.displayName || 'No asignado'}
                      </div>
                    </div>
                  </div>
                   <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {memberStudents.length} alumnos
                  </span>
                </div>

                {/* Stacked avatars */}
                {memberStudents.length > 0 && (
                  <div className="flex -space-x-2 overflow-hidden">
                    {memberStudents.slice(0, 7).map(s => (
                      <div key={s.id} title={s.nombres ? `${s.nombres} ${s.apellidos}` : s.email}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isDarkMode ? 'bg-gray-700 text-gray-300 border-[#151c2c]' : 'bg-gray-200 text-gray-600 border-white'}`}>
                        {(s.nombres || s.email || '?')[0].toUpperCase()}
                      </div>
                    ))}
                    {memberStudents.length > 7 && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isDarkMode ? 'bg-gray-800 text-gray-400 border-[#151c2c]' : 'bg-gray-100 text-gray-500 border-white'}`}>
                        +{memberStudents.length - 7}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions — 2x2 grid */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button onClick={() => setAttend(g)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}>
                    <ClipboardCheck size={13} /> Asistencia
                  </button>
                  <button onClick={() => setHistory(g)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                    <History size={13} /> Historial
                  </button>
                  <button onClick={() => openEdit(g)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <Edit2 size={13} /> Editar
                  </button>
                  <button onClick={() => handleDelete(g.id)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Group Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`w-full max-w-xl flex flex-col max-h-[90vh] rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
            <div className="flex items-center justify-between p-8 pb-4 shrink-0">
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-200"><X size={22} /></button>
            </div>
            <div className="px-8 overflow-y-auto flex-1 space-y-5 pb-2">
              <div>
                <label className={lbl}>Nombre del Grupo</label>
                <input type="text" className={inp} placeholder="Ej. Grupo A — Turno Matutino"
                  value={formData.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Descripción (opcional)</label>
                <textarea rows={2} className={`${inp} resize-none`} placeholder="Ej. Primer año..."
                  value={formData.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Docente Asignado</label>
                <select className={inp} value={formData.teacherId} onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))}>
                   <option value="">Seleccionar Docente...</option>
                   {teachers.map(t => (
                     <option key={t.id} value={t.id}>{t.displayName || t.email}</option>
                   ))}
                </select>
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><UserPlus size={12} /> Alumnos ({formData.studentIds.length} seleccionados)</span></label>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" className={`${inp} pl-9`} placeholder="Buscar alumno..."
                    value={studentSearch} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className={`rounded-2xl border overflow-hidden max-h-52 overflow-y-auto ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  {filteredStudents.length === 0
                    ? <p className="py-6 text-center text-sm text-gray-400">No se encontraron alumnos</p>
                    : filteredStudents.map(s => {
                      const selected = formData.studentIds.includes(s.id);
                      return (
                        <button key={s.id} type="button" onClick={() => toggle(s.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b last:border-0 ${isDarkMode ? 'border-gray-800 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'} ${selected ? (isDarkMode ? 'bg-cyan-500/10' : 'bg-indigo-50') : ''}`}>
                          <div className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center ${selected ? (isDarkMode ? 'bg-cyan-500 border-cyan-500' : 'bg-indigo-600 border-indigo-600') : (isDarkMode ? 'border-gray-600' : 'border-gray-300')}`}>
                            {selected && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            {(s.nombres || s.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{s.nombres ? `${s.nombres} ${s.apellidos}` : s.email}</div>
                            {s.nombres && <div className="text-xs text-gray-400">{s.email}</div>}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
            <div className="flex gap-4 p-8 pt-4 shrink-0">
              <button onClick={() => setShowModal(false)}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-gray-500 hover:bg-gray-100'}`}>Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {saving ? 'Guardando...' : editingGroup ? 'Guardar Cambios' : 'Crear Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance Modal ── */}
      {attendGroup && <AttendanceModal group={attendGroup} students={students} isDarkMode={isDarkMode} onClose={() => setAttend(null)} />}

      {/* ── History Modal ── */}
      {historyGroup && <HistoryModal group={historyGroup} isDarkMode={isDarkMode} onClose={() => setHistory(null)} />}
    </div>
  );
}
