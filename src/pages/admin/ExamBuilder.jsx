import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Clock, Hash,
  Shuffle, Save, ArrowLeft, CheckSquare, AlignLeft, ToggleLeft,
  PenLine, List, Image as ImageIcon, Loader2, X
} from 'lucide-react';

// ── Question type definitions ─────────────────────────────────────────────────
const QUESTION_TYPES = [
  { value: 'multiple',     label: 'Selección Múltiple',   icon: CheckSquare,  color: 'bg-blue-500/10 text-blue-400' },
  { value: 'truefalse',   label: 'Verdadero / Falso',     icon: ToggleLeft,   color: 'bg-purple-500/10 text-purple-400' },
  { value: 'short',        label: 'Respuesta Corta',       icon: AlignLeft,    color: 'bg-emerald-500/10 text-emerald-400' },
  { value: 'fillblank',    label: 'Completar el Espacio',  icon: PenLine,      color: 'bg-amber-500/10 text-amber-400' },
  { value: 'ordering',     label: 'Ordenar Palabras',      icon: List,         color: 'bg-orange-500/10 text-orange-400' },
  { value: 'imageidentify',label: 'Identificar Imagen',    icon: ImageIcon,    color: 'bg-pink-500/10 text-pink-400' },
];

const defaultQuestion = () => ({
  id: Date.now() + Math.random(),
  type: 'multiple',
  text: '',
  points: 1,
  // multiple choice
  options: ['', '', '', ''],
  correctOption: 0,
  // true/false
  correctBool: true,
  // short answer & image identify
  correctShort: '',
  // fill in the blank — text uses ___ as blank placeholder, answer = correctShort
  // ordering — text is the scrambled sentence, correctOrder is the correct sentence
  correctOrder: '',
  // image identify
  imageUrl: '',
  imageFile: null, // temp, not stored in Firestore
});

export default function ExamBuilder({ examId }) {
  const { user, role } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const isEditMode = Boolean(examId);

  const [examMeta, setExamMeta] = useState({
    title: '',
    description: '',
    timeLimitMinutes: '',
    randomOrder: false,
    classId: '',
  });
  const [questions, setQuestions] = useState([defaultQuestion()]);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [loadingExam, setLoadingExam] = useState(isEditMode);

  // ── Load existing exam when editing ──────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;
    getDoc(doc(db, 'exams', examId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setExamMeta({
          title: data.title || '',
          description: data.description || '',
          timeLimitMinutes: data.timeLimitMinutes || '',
          randomOrder: data.randomOrder || false,
          classId: data.classId || '',
        });
        setQuestions((data.questions || []).map(q => ({ ...q, id: Date.now() + Math.random() })));
      }
      setLoadingExam(false);
    }).catch(e => { console.error(e); setLoadingExam(false); });
  }, [examId, isEditMode]);

  const updateMeta = (k, v) => setExamMeta(p => ({ ...p, [k]: v }));

  const addQuestion = () => {
    setQuestions(p => [...p, defaultQuestion()]);
    setExpandedIndex(questions.length);
  };

  const removeQuestion = (idx) => {
    setQuestions(p => p.filter((_, i) => i !== idx));
    setExpandedIndex(Math.max(0, idx - 1));
  };

  const updateQuestion = (idx, field, value) =>
    setQuestions(p => p.map((q, i) => i === idx ? { ...q, [field]: value } : q));

  const updateOption = (qIdx, oIdx, value) =>
    setQuestions(p => p.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    }));

  const addOption = (qIdx) =>
    setQuestions(p => p.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ''] } : q));

  const removeOption = (qIdx, oIdx) =>
    setQuestions(p => p.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = q.options.filter((_, oi) => oi !== oIdx);
      return { ...q, options: opts, correctOption: Math.min(q.correctOption, opts.length - 1) };
    }));

  // ── Image → Base64 (no Storage rules needed) ─────────────────────────────
  const handleImageUpload = (qIdx, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('La imagen es demasiado grande. Máximo 5 MB.'); return; }
    setUploadingIdx(qIdx);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 800px on longest side
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.75);
        updateQuestion(qIdx, 'imageUrl', base64);
        setUploadingIdx(null);
      };
      img.onerror = () => { alert('No se pudo leer la imagen.'); setUploadingIdx(null); };
      img.src = e.target.result;
    };
    reader.onerror = () => { alert('Error al leer el archivo.'); setUploadingIdx(null); };
    reader.readAsDataURL(file);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!examMeta.title.trim()) return alert('El examen necesita un título.');
    if (questions.some(q => !q.text.trim())) return alert('Todas las preguntas necesitan texto.');
    if (questions.some(q => q.type === 'imageidentify' && !q.imageUrl)) return alert('Todas las preguntas de imagen deben tener una imagen subida.');

    setSaving(true);
    try {
      const payload = {
        ...examMeta,
        timeLimitMinutes: examMeta.timeLimitMinutes ? Number(examMeta.timeLimitMinutes) : null,
        questions: questions.map(({ id, imageFile, _previewUrl, ...q }) => q),
        ...(isEditMode ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp(), status: 'active' }),
      };
      if (isEditMode) {
        await updateDoc(doc(db, 'exams', examId), payload);
        alert('¡Examen actualizado correctamente!');
      } else {
        await addDoc(collection(db, 'exams'), { 
          ...payload, 
          teacherId: user.uid // Track creator
        });
        alert('¡Examen publicado con éxito!');
      }
      navigate(role === 'admin' ? '/admin/tasks' : '/teacher/exams');
    } catch (err) {
      console.error(err);
      alert('Error al guardar el examen.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingExam) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card = `rounded-3xl border p-6 transition-all ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `w-full p-3 rounded-xl text-sm border focus:outline-none transition-all ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
  const label = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;
  const typeInfo = (t) => QUESTION_TYPES.find(x => x.value === t);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/admin/tasks')} className={`p-2 rounded-xl ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{isEditMode ? 'Editar Examen' : 'Crear Nuevo Examen'}</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{questions.length} pregunta{questions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Meta */}
      <div className={`${card} mb-6`}>
        <h2 className={`text-lg font-bold mb-5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Configuración del Examen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className={label}>Título del Examen</label>
            <input type="text" className={input} placeholder="Ej. Parcial #1 — Matemáticas Discretas" value={examMeta.title} onChange={e => updateMeta('title', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={label}>Instrucciones para el alumno</label>
            <textarea rows={2} className={`${input} resize-none`} placeholder="Lee cuidadosamente cada pregunta..." value={examMeta.description} onChange={e => updateMeta('description', e.target.value)} />
          </div>
          <div>
            <label className={label}><span className="flex items-center gap-1"><Clock size={12} /> Tiempo Límite (minutos)</span></label>
            <input type="number" min="1" className={input} placeholder="Sin límite (dejar vacío)" value={examMeta.timeLimitMinutes} onChange={e => updateMeta('timeLimitMinutes', e.target.value)} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <button onClick={() => updateMeta('randomOrder', !examMeta.randomOrder)} className={`relative w-11 h-6 rounded-full transition-colors ${examMeta.randomOrder ? (isDarkMode ? 'bg-cyan-500' : 'bg-indigo-600') : (isDarkMode ? 'bg-gray-700' : 'bg-gray-300')}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${examMeta.randomOrder ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <span className={`text-sm font-semibold flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}><Shuffle size={14} /> Orden aleatorio</span>
              <p className="text-xs text-gray-500">Mezcla las preguntas para cada alumno</p>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {questions.map((q, qIdx) => {
          const TIcon = typeInfo(q.type)?.icon || CheckSquare;
          return (
            <div key={q.id} className={`${card} !p-0 overflow-hidden`}>
              {/* Accordion Header */}
              <button type="button" onClick={() => setExpandedIndex(expandedIndex === qIdx ? -1 : qIdx)}
                className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${isDarkMode ? 'hover:bg-white/3' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isDarkMode ? 'bg-[#0b1120] text-cyan-400' : 'bg-indigo-50 text-indigo-600'}`}>{qIdx + 1}</span>
                  <span className={`text-sm font-semibold truncate max-w-[200px] sm:max-w-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{q.text || 'Pregunta sin título'}</span>
                  <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${typeInfo(q.type)?.color}`}>
                    <TIcon size={12} /> {typeInfo(q.type)?.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>{q.points} pts</span>
                  {expandedIndex === qIdx ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </button>

              {/* Accordion Body */}
              {expandedIndex === qIdx && (
                <div className={`px-6 pb-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                    <div>
                      <label className={label}>Tipo de Pregunta</label>
                      <select value={q.type} onChange={e => updateQuestion(qIdx, 'type', e.target.value)} className={`${input} appearance-none`}>
                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}><span className="flex items-center gap-1"><Hash size={12} /> Puntos</span></label>
                      <input type="number" min="0.5" step="0.5" value={q.points} onChange={e => updateQuestion(qIdx, 'points', parseFloat(e.target.value) || 1)} className={input} />
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => removeQuestion(qIdx)} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors w-full justify-center">
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mt-4">
                    <label className={label}>
                      {q.type === 'fillblank' ? 'Oración con espacio (usa ___ para indicar el espacio en blanco)' :
                       q.type === 'ordering' ? 'Oración correcta (se mostrará desordenada al alumno)' :
                       q.type === 'imageidentify' ? 'Pregunta / Instrucción para el alumno' :
                       'Texto de la Pregunta'}
                    </label>
                    <textarea rows={2} className={`${input} resize-none`}
                      placeholder={
                        q.type === 'fillblank' ? 'Ej: La capital de Nicaragua es ___.' :
                        q.type === 'ordering' ? 'Ej: El perro corre por el parque' :
                        q.type === 'imageidentify' ? 'Ej: ¿Qué animal se muestra en la imagen?' :
                        'Escribe la pregunta aquí...'
                      }
                      value={q.text} onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                    />
                  </div>

                  {/* ── MULTIPLE CHOICE ── */}
                  {q.type === 'multiple' && (
                    <div className="mt-4 space-y-2">
                      <label className={label}>Opciones (marca la correcta)</label>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-3">
                          <button type="button" onClick={() => updateQuestion(qIdx, 'correctOption', oIdx)}
                            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${q.correctOption === oIdx ? (isDarkMode ? 'border-cyan-400 bg-cyan-400' : 'border-indigo-600 bg-indigo-600') : (isDarkMode ? 'border-gray-600' : 'border-gray-300')}`}>
                            {q.correctOption === oIdx && <span className="w-2 h-2 bg-white rounded-full" />}
                          </button>
                          <input type="text" className={`${input} flex-1`} placeholder={`Opción ${oIdx + 1}`} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} />
                          {q.options.length > 2 && (
                            <button onClick={() => removeOption(qIdx, oIdx)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                          )}
                        </div>
                      ))}
                      {q.options.length < 6 && (
                        <button onClick={() => addOption(qIdx)} className={`mt-2 text-sm font-semibold flex items-center gap-1 ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>
                          <Plus size={15} /> Añadir opción
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── TRUE / FALSE ── */}
                  {q.type === 'truefalse' && (
                    <div className="mt-4">
                      <label className={label}>Respuesta Correcta</label>
                      <div className="flex gap-3">
                        {[true, false].map(val => (
                          <button key={String(val)} type="button" onClick={() => updateQuestion(qIdx, 'correctBool', val)}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${q.correctBool === val ? (isDarkMode ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-indigo-100 border-indigo-500 text-indigo-700') : (isDarkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-500')}`}>
                            {val ? '✓ Verdadero' : '✗ Falso'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── SHORT ANSWER ── */}
                  {q.type === 'short' && (
                    <div className="mt-4">
                      <label className={label}>Respuesta Esperada (comparación automática)</label>
                      <input type="text" className={input} placeholder="La respuesta exacta o palabra clave..." value={q.correctShort} onChange={e => updateQuestion(qIdx, 'correctShort', e.target.value)} />
                      <p className="text-xs text-gray-500 mt-1">Se compara sin distinguir mayúsculas. Si se deja vacío, se califica manualmente.</p>
                    </div>
                  )}

                  {/* ── FILL IN THE BLANK ── */}
                  {q.type === 'fillblank' && (
                    <div className="mt-4 space-y-3">
                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">💡 Cómo usar</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">Escribe la oración arriba y usa <code className="bg-amber-200/50 px-1 rounded">___</code> donde debe ir el espacio en blanco. Ej: "La capital de Francia es ___."</p>
                      </div>
                      <div>
                        <label className={label}>Respuesta Correcta del Espacio</label>
                        <input type="text" className={input} placeholder="Ej: París" value={q.correctShort} onChange={e => updateQuestion(qIdx, 'correctShort', e.target.value)} />
                        <p className="text-xs text-gray-500 mt-1">El alumno verá la oración con un campo de texto en lugar de ___</p>
                      </div>
                    </div>
                  )}

                  {/* ── ORDERING ── */}
                  {q.type === 'ordering' && (
                    <div className="mt-4 space-y-3">
                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                        <p className="text-xs text-orange-600 font-semibold mb-1">💡 Cómo funciona</p>
                        <p className="text-xs text-orange-700">Escribe la oración CORRECTA arriba (en campo "Texto de la Pregunta"). El sistema la mezclará automáticamente para el alumno. Aquí confirma la respuesta final.</p>
                      </div>
                      <div>
                        <label className={label}>Confirmar Oración Correcta</label>
                        <input type="text" className={input} placeholder="La misma oración correcta que escribiste arriba"
                          value={q.correctOrder} onChange={e => updateQuestion(qIdx, 'correctOrder', e.target.value)} />
                        <p className="text-xs text-gray-500 mt-1">El alumno arrastrará palabras para formarla.</p>
                      </div>
                    </div>
                  )}

                  {/* ── IMAGE IDENTIFY ── */}
                  {q.type === 'imageidentify' && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className={label}>Imagen a identificar</label>
                        <div className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${isDarkMode ? 'border-gray-700 hover:border-pink-500/50' : 'border-gray-200 hover:border-pink-400'}`}>
                          {q.imageUrl ? (
                            <div className="relative">
                              <img src={q.imageUrl} alt="preview" className="max-h-48 mx-auto rounded-xl object-contain" />
                              <button onClick={() => updateQuestion(qIdx, 'imageUrl', '')}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                                <X size={14} />
                              </button>
                            </div>
                          ) : uploadingIdx === qIdx ? (
                            <div className="flex flex-col items-center gap-2 text-pink-400">
                              <Loader2 size={32} className="animate-spin" />
                              <span className="text-sm">Subiendo imagen...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <ImageIcon size={32} className="text-gray-400" />
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Haz clic para subir una imagen</p>
                              <p className="text-xs text-gray-400">JPG, PNG, GIF — máx. 5 MB</p>
                            </div>
                          )}
                          <input
                            type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={e => e.target.files[0] && handleImageUpload(qIdx, e.target.files[0])}
                            disabled={uploadingIdx === qIdx}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={label}>Respuesta Correcta (nombre de la imagen)</label>
                        <input type="text" className={input} placeholder="Ej: Mariposa Monarca" value={q.correctShort} onChange={e => updateQuestion(qIdx, 'correctShort', e.target.value)} />
                        <p className="text-xs text-gray-500 mt-1">El alumno escribe el nombre. Se compara sin distinguir mayúsculas.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add + Save */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button onClick={addQuestion}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold border-2 border-dashed transition-all ${isDarkMode ? 'border-gray-700 text-gray-400 hover:border-cyan-500/50 hover:text-cyan-400' : 'border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600'}`}>
          <Plus size={18} /> Agregar Nueva Pregunta
        </button>
        <button onClick={handleSave} disabled={saving}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white shadow-xl transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {saving ? <><Loader2 size={18} className="animate-spin" /> Publicando...</> : <><Save size={18} /> Publicar Examen</>}
        </button>
      </div>
    </div>
  );
}
