import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { BarChart3, User, CheckCircle, Clock, Edit3, Save, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

export default function ExamResults({ examId, examTitle }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();

  // For manual grading
  const [gradingResult, setGradingResult] = useState(null); // { resultId, graded }
  const [manualScores, setManualScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [expandedResultId, setExpandedResultId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // For Reset Modal
  const [resetModalData, setResetModalData] = useState(null); // { resultId, userId, userEmail }
  const [penaltyTime, setPenaltyTime] = useState('');

  useEffect(() => {
    if (!examId) return;
    
    // First, fetch all users to have a dictionary of names
    const fetchUsersAndResults = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersDict = {};
        usersSnap.forEach(doc => {
          const data = doc.data();
          usersDict[doc.id] = data.displayName || (data.nombres ? `${data.nombres} ${data.apellidos}` : null);
        });

        // Then listen to results
        const q = query(collection(db, 'exam_results'), where('examId', '==', examId));
        return onSnapshot(q, snap => {
          const processedResults = snap.docs.map(d => {
            const data = d.data();
            // Try to use the userDictionary if userName is missing or is just the email prefix
            let realName = data.userName;
            if (!realName || realName === data.userEmail.split('@')[0]) {
               realName = usersDict[data.userId] || realName || data.userEmail.split('@')[0];
            }
            return { id: d.id, ...data, userName: realName };
          });
          setResults(processedResults);
          setLoading(false);
        });
      } catch (e) {
        console.error("Error fetching data:", e);
        setLoading(false);
      }
    };

    let unsubscribe = () => {};
    fetchUsersAndResults().then(unsub => {
       if (unsub) unsubscribe = unsub;
    });

    return () => unsubscribe();
  }, [examId]);

  const startManualGrading = (result) => {
    const init = {};
    result.graded.forEach((q, idx) => {
      if (q.earnedPoints === null) init[idx] = '';
    });
    setManualScores(init);
    setGradingResult(result);
  };

  const saveManualGrading = async () => {
    if (!gradingResult) return;
    setSaving(true);
    try {
      const updatedGraded = gradingResult.graded.map((q, idx) => ({
        ...q,
        earnedPoints: q.earnedPoints === null ? (parseFloat(manualScores[idx]) || 0) : q.earnedPoints,
      }));
      const totalEarned = updatedGraded.reduce((s, q) => s + (q.earnedPoints || 0), 0);
      const pct = Math.round((totalEarned / gradingResult.totalPoints) * 100);

      await updateDoc(doc(db, 'exam_results', gradingResult.id), {
        graded: updatedGraded,
        earnedPoints: totalEarned,
        percentageScore: pct,
        needsManualGrading: false,
      });
      setGradingResult(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetModalData) return;
    setSaving(true);
    try {
      // Ya NO borramos el intento previo, solo creamos el permiso para uno nuevo
      if (penaltyTime) {
        const overrideId = `${examId}_${resetModalData.userId}`;
        await setDoc(doc(db, 'exam_overrides', overrideId), {
          examId,
          userId: resetModalData.userId,
          timeLimitMinutes: parseFloat(penaltyTime),
          createdAt: new Date().toISOString()
        });
      } else {
        // Si no hay penalidad, igual creamos el override con null para autorizar el re-intento
        const overrideId = `${examId}_${resetModalData.userId}`;
        await setDoc(doc(db, 'exam_overrides', overrideId), {
          examId,
          userId: resetModalData.userId,
          timeLimitMinutes: null,
          createdAt: new Date().toISOString()
        });
      }
      
      setResetModalData(null);
      setPenaltyTime('');
    } catch (e) {
      console.error(e);
      alert("Error al habilitar el re-intento.");
    } finally {
      setSaving(false);
    }
  };

  const card = `rounded-3xl border ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `w-full p-2.5 rounded-xl text-sm border focus:outline-none transition-all ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;

  if (loading) return <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" /></div>;

  // Grouping logic
  const resultsByUser = results.reduce((acc, r) => {
    if (!acc[r.userId]) acc[r.userId] = { 
      userId: r.userId, 
      userEmail: r.userEmail, 
      userName: r.userName || r.displayName || r.userEmail.split('@')[0],
      attempts: [] 
    };
    acc[r.userId].attempts.push(r);
    return acc;
  }, {});

  const groupedList = Object.values(resultsByUser)
    .filter(u => 
      u.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const latestA = Math.max(...a.attempts.map(at => at.submittedAt?.toMillis ? at.submittedAt.toMillis() : 0));
      const latestB = Math.max(...b.attempts.map(at => at.submittedAt?.toMillis ? at.submittedAt.toMillis() : 0));
      return latestB - latestA;
    });

  const avgScore = results.length > 0
    ? Math.round(results.filter(r => r.percentageScore !== null).reduce((s, r) => s + (r.percentageScore || 0), 0) / results.filter(r => r.percentageScore !== null).length)
    : null;

  return (
    <div className="p-4 md:p-6">
      {examTitle && <h2 className={`text-xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{examTitle}</h2>}
      <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestión de intentos y resultados históricos</p>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Alumnos evaluados', value: groupedList.length, icon: <User size={16} />, color: 'text-blue-400' },
          { label: 'Promedio general', value: avgScore !== null ? `${avgScore}%` : 'N/A', icon: <BarChart3 size={16} />, color: 'text-emerald-400' },
          { label: 'Total intentos', value: results.length, icon: <CheckCircle size={16} />, color: 'text-green-400' },
          { label: 'Pendientes', value: results.filter(r => r.needsManualGrading).length, icon: <Clock size={16} />, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className={`${card} p-5`}>
            <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <span className={s.color}>{s.icon}</span> {s.label}
            </div>
            <div className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <User size={18} />
          </div>
          <input
            type="text"
            className={`${input} pl-10`}
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Results Table grouped by User */}
      {groupedList.length === 0 ? (
        <div className={`text-center py-16 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <p className="text-gray-500">Aún no hay intentos registrados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedList.map(userGroup => {
            const isUserExpanded = expandedResultId === userGroup.userId;
            const latestAttempt = [...userGroup.attempts].sort((a,b) => (b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0) - (a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0))[0];

            return (
              <div key={userGroup.userId} className={`${card} overflow-hidden shadow-lg transition-all`}>
                <div
                  className={`flex flex-col md:flex-row md:items-center justify-between px-6 py-5 cursor-pointer gap-4 ${isDarkMode ? 'hover:bg-white/3' : 'hover:bg-gray-50'}`}
                  onClick={() => setExpandedResultId(isUserExpanded ? null : userGroup.userId)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isDarkMode ? 'bg-[#0b1120] text-cyan-400' : 'bg-indigo-100 text-indigo-600'}`}>
                      {userGroup.userName[0].toUpperCase()}
                    </div>
                    <div>
                      <div className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userGroup.userName}</div>
                      <div className="text-xs text-gray-500">
                        {userGroup.userEmail} • {userGroup.attempts.length} {userGroup.attempts.length === 1 ? 'intento' : 'intentos'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 justify-between md:justify-end">
                    <div className="text-right">
                        <div className={`text-2xl font-black ${
                            latestAttempt.percentageScore <= 59 ? 'text-red-500' : 
                            latestAttempt.percentageScore <= 70 ? 'text-amber-500' : 
                            'text-green-500'
                        }`}>
                            {latestAttempt.percentageScore !== null ? `${latestAttempt.percentageScore}%` : '---'}
                        </div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Última nota</div>
                    </div>
                    
                    <button
                      onClick={e => { 
                        e.stopPropagation(); 
                        setResetModalData({ resultId: latestAttempt.id, userId: userGroup.userId, userEmail: userGroup.userName });
                        setPenaltyTime(''); 
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    >
                      <Trash2 size={13} /> {userGroup.attempts.length > 0 ? "Habilitar re-intento" : "Habilitar intento"}
                    </button>
                    {isUserExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {/* History list for this user */}
                {isUserExpanded && (
                  <div className={`border-t bg-black/5 p-4 md:p-8 space-y-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Historial de Intentos</h4>
                    {userGroup.attempts.sort((a,b) => (b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0) - (a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0)).map((r, idx) => (
                      <div key={r.id} className={`${card} p-5 md:p-7 border-2 shadow-sm ${isDarkMode ? 'bg-[#0b1120] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b pb-4 dark:border-gray-800">
                           <div>
                              <span className={`text-sm font-black uppercase tracking-widest block mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Intento {userGroup.attempts.length - idx}</span>
                              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                {r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleString('es-NI') : 
                                 (r.submittedAt?.toMillis ? new Date(r.submittedAt.toMillis()).toLocaleString('es-NI') : 'Fecha desconocida')}
                              </span>
                           </div>
                           <div className="flex items-center gap-4">
                              {r.needsManualGrading ? (
                                <button
                                    onClick={e => { e.stopPropagation(); startManualGrading(r); }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isDarkMode ? 'bg-amber-400/10 text-amber-400 hover:bg-amber-400/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                                >
                                    <Clock size={16} /> Calificar Intento
                                </button>
                              ) : (
                                <span className={`text-2xl md:text-3xl font-black ${
                                    r.percentageScore <= 59 ? 'text-red-500' : 
                                    r.percentageScore <= 70 ? 'text-amber-500' : 
                                    'text-green-500'
                                }`}>
                                    {r.percentageScore}%
                                </span>
                              )}
                           </div>
                        </div>
                        
                        {/* Questions review togglable in history or always visible? Let's make it always visible if user expanded student */}
                        <div className="space-y-4">
                             {r.graded?.map((gq, gIdx) => {
                                const isCorrect = gq.earnedPoints > 0;
                                const isPending = gq.earnedPoints === null;
                                const isIncorrect = gq.earnedPoints === 0;

                                return (
                                  <div key={gIdx} className={`p-4 md:p-5 rounded-2xl border ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                      <p className={`text-base font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                          <span className="text-gray-500 mr-2">{gIdx+1}.</span> {gq.text}
                                      </p>
                                      
                                      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl ${
                                          isCorrect ? (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700') :
                                          isPending ? (isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700') :
                                          (isDarkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-700')
                                      }`}>
                                          <div className="text-sm font-bold break-words">
                                            R: {(() => {
                                                if (gq.userAnswer === undefined || gq.userAnswer === null || gq.userAnswer === '') return 'Sin respuesta';
                                                if (gq.type === 'multiple' && gq.options) return Number.isInteger(gq.userAnswer) ? gq.options[gq.userAnswer] : gq.userAnswer;
                                                if (gq.type === 'truefalse') return gq.userAnswer === true ? 'Verdadero' : 'Falso';
                                                if (gq.type === 'ordering' && Array.isArray(gq.userAnswer)) return gq.userAnswer.join(' ');
                                                return String(gq.userAnswer);
                                            })()}
                                          </div>
                                          <div className={`shrink-0 text-sm font-black px-3 py-1 rounded-lg bg-black/5`}>
                                              {gq.earnedPoints ?? '?'}/{gq.points} pts
                                          </div>
                                      </div>
                                  </div>
                                )
                             })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Grading Modal */}
      {gradingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`w-full max-w-xl p-8 rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Calificar — {gradingResult.userEmail}
              </h3>
              <button onClick={() => setGradingResult(null)} className="text-gray-400 hover:text-gray-200"><X size={22} /></button>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {gradingResult.graded.map((q, idx) => {
                if (q.earnedPoints !== null) return null;
                return (
                  <div key={idx} className={`p-4 rounded-2xl ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
                    <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{q.text}</p>
                    <p className="text-xs text-gray-500 mb-3">Respuesta del alumno: <span className="font-semibold">{q.userAnswer || '(sin respuesta)'}</span></p>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Puntos a asignar (máx. {q.points})</label>
                      <input
                        type="number" min="0" max={q.points} step="0.5"
                        className={input}
                        placeholder={`0 – ${q.points}`}
                        value={manualScores[idx] ?? ''}
                        onChange={e => setManualScores(p => ({ ...p, [idx]: e.target.value }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-6">
              <button onClick={() => setGradingResult(null)} className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-gray-500 hover:bg-gray-100'}`}>Cancelar</button>
              <button
                onClick={saveManualGrading} disabled={saving}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Calificación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Penalty Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`w-full max-w-sm p-8 rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Reiniciar Examen</h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Vas a reiniciar el examen de <b>{resetModalData.userEmail}</b>. Esto borrará su intento actual permanentemente.
            </p>

            <div className="mb-6">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Penalidad de Tiempo (opcional)
              </label>
              <input
                type="number"
                placeholder="Minutos para el nuevo intento..."
                className={input}
                value={penaltyTime}
                onChange={e => setPenaltyTime(e.target.value)}
              />
              <p className="mt-2 text-[10px] text-gray-500 italic">Dejar vacío para usar el tiempo original del examen.</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setResetModalData(null)} 
                className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReset} disabled={saving}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 ${isDarkMode ? 'bg-red-500 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {saving ? 'Reiniciando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
