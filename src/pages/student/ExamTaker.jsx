import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Send, GripVertical } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
// ── Helpers ──────────────────────────────────────────────────────────────────
const shuffleArray = (arr) => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const scoreAnswer = (question, answer) => {
  switch (question.type) {
    case 'multiple':
      return answer === question.correctOption ? question.points : 0;
    case 'truefalse':
      return answer === question.correctBool ? question.points : 0;
    case 'short':
      if (!question.correctShort) return null;
      return answer?.trim().toLowerCase() === question.correctShort?.trim().toLowerCase() ? question.points : 0;
    case 'fillblank':
      if (!question.correctShort) return null;
      return answer?.trim().toLowerCase() === question.correctShort?.trim().toLowerCase() ? question.points : 0;
    case 'ordering': {
      // answer is array of words in chosen order — join and compare
      const userSentence = Array.isArray(answer) ? answer.join(' ').toLowerCase().trim() : '';
      const correct = (question.correctOrder || question.text || '').toLowerCase().trim();
      return userSentence === correct ? question.points : 0;
    }
    case 'imageidentify':
      if (!question.correctShort) return null;
      return answer?.trim().toLowerCase() === question.correctShort?.trim().toLowerCase() ? question.points : 0;
    default: return 0;
  }
};

// ── Timer ─────────────────────────────────────────────────────────────────────
function Timer({ secondsLeft, totalSeconds }) {
  const { isDarkMode } = useTheme();
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const isUrgent = secondsLeft <= 60;
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-colors ${isUrgent ? 'bg-red-500/10 border-red-500/30 animate-pulse' : (isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200')}`}>
      <Clock size={16} className={isUrgent ? 'text-red-500' : (isDarkMode ? 'text-cyan-400' : 'text-indigo-600')} />
      <span className={`text-base font-black tabular-nums ${isUrgent ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>{mm}:{ss}</span>
    </div>
  );
}

// ── Word Ordering Widget ──────────────────────────────────────────────────────
function WordOrderWidget({ question, value, onChange }) {
  const { isDarkMode } = useTheme();
  const placed = value || [];
  const allWords = question.shuffledWords || [];

  // Recalculate bank based on placed words (handling duplicates)
  const bank = useMemo(() => {
    let tempBank = [...allWords];
    placed.forEach(word => {
      const idx = tempBank.indexOf(word);
      if (idx > -1) tempBank.splice(idx, 1);
    });
    return tempBank;
  }, [allWords, placed]);

  const placeWord = (word) => {
    onChange([...placed, word]);
  };

  const unplaceWord = (wIdx) => {
    const newPlaced = placed.filter((_, i) => i !== wIdx);
    onChange(newPlaced);
  };

  const chip = (text, onClick, key, variant = 'bank') => (
    <button key={key} type="button" onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
        variant === 'placed'
          ? (isDarkMode ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400' : 'bg-indigo-100 border border-indigo-300 text-indigo-800 hover:bg-red-100 hover:text-red-600')
          : (isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300' : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700')
      }`}>
      {text}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Answer area */}
      <div className={`min-h-16 p-4 rounded-2xl border-2 border-dashed flex flex-wrap gap-2 items-center transition-colors ${isDarkMode ? 'border-gray-700 bg-[#0b1120]' : 'border-gray-200 bg-gray-50'}`}>
        {placed.length === 0
          ? <span className="text-sm text-gray-400">Haz clic en las palabras para construir la oración...</span>
          : placed.map((w, i) => chip(w, () => unplaceWord(i), `placed-${i}`, 'placed'))
        }
      </div>
      <p className="text-xs text-gray-400">Haz clic en una palabra colocada para devolverla al banco.</p>
      {/* Word bank */}
      <div className="flex flex-wrap gap-2">
        {bank.map((w, i) => chip(w, () => placeWord(w), `bank-${i}`, 'bank'))}
      </div>
    </div>
  );
}

// ── Fill-in-blank renderer ────────────────────────────────────────────────────
function FillBlank({ question, value, onChange, isDarkMode }) {
  const parts = (question.text || '').split('___');
  return (
    <div className="leading-relaxed">
      {parts.map((part, i) => (
        <span key={i}>
          <span className={`text-base ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{part}</span>
          {i < parts.length - 1 && (
            <input
              type="text"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              placeholder="____________"
              className={`inline-block mx-2 px-3 py-1.5 rounded-lg text-sm border focus:outline-none transition-all w-40 ${isDarkMode ? 'bg-[#0b1120] border-cyan-500/40 text-cyan-200 focus:border-cyan-400' : 'bg-indigo-50 border-indigo-300 text-indigo-900 focus:border-indigo-500'}`}
            />
          )}
        </span>
      ))}
    </div>
  );
}

// ── Main ExamTaker ────────────────────────────────────────────────────────────
export default function ExamTaker() {
  const { examId } = useParams();
  const { user, userData } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const questionsInitialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [overrideTime, setOverrideTime] = useState(null);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'exams', examId));
        if (!snap.exists()) { navigate(-1); return; }
        const data = { id: snap.id, ...snap.data() };

        // Check for time overrides (Attempt Authorization)
        const overrideDoc = await getDoc(doc(db, 'exam_overrides', `${examId}_${user.uid}`));
        const hasOverride = overrideDoc.exists();
        
        if (hasOverride) {
          setOverrideTime(overrideDoc.data().timeLimitMinutes);
        } else {
          // Si no hay override, verificar si ya lo tomó
          const q2 = query(collection(db, 'exam_results'), where('examId', '==', examId), where('userId', '==', user.uid));
          const existing = await getDocs(q2);
          if (!existing.empty) { setAlreadyTaken(true); setLoading(false); return; }
        }

        if (!questionsInitialized.current) {
          const processedQs = (data.questions || []).map((q, idx) => {
            const stableId = q.id || `q-${idx}-${Date.now()}`;
            if (q.type === 'ordering') {
              // Pre-shuffle words for ordering questions
              return { 
                ...q, 
                id: stableId, 
                shuffledWords: shuffleArray((q.text || '').split(' ').filter(Boolean)) 
              };
            }
            return { ...q, id: stableId };
          });

          const finalQs = data.randomOrder ? shuffleArray(processedQs) : processedQs;
          setQuestions(finalQs);
          questionsInitialized.current = true;
        }
        setExam(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [examId, user, navigate]);

  const submitExam = useCallback(async (forcedAnswers) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    const usedAnswers = forcedAnswers || answers;
    const totalPoints = questions.reduce((s, q) => s + (q.points || 1), 0);
    let earnedAuto = 0;
    let needsManualGrading = false;
    const graded = questions.map((q, idx) => {
      const ans = usedAnswers[idx];
      const pts = scoreAnswer(q, ans);
      if (pts === null) { needsManualGrading = true; return { ...q, userAnswer: ans, earnedPoints: null }; }
      earnedAuto += pts;
      return { ...q, userAnswer: ans, earnedPoints: pts };
    });
    const pct = needsManualGrading ? null : Math.round((earnedAuto / totalPoints) * 100);
    try {
      const userName = userData?.displayName || (userData?.nombres ? `${userData.nombres} ${userData.apellidos}` : user.email);
      
      await addDoc(collection(db, 'exam_results'), {
        examId, examTitle: exam.title, userId: user.uid, userEmail: user.email,
        userName, // Guardar el nombre real
        graded, totalPoints, earnedPoints: needsManualGrading ? null : earnedAuto,
        percentageScore: pct, needsManualGrading, submittedAt: serverTimestamp(),
      });

      // Importante: Eliminar el override después de usarlo para cerrar el permiso de intento
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'exam_overrides', `${examId}_${user.uid}`));

    } catch (e) { console.error(e); }
    setResult({ graded, earnedPoints: earnedAuto, totalPoints, percentageScore: pct, needsManualGrading });
    setSubmitted(true);
    setSubmitting(false);
  }, [answers, exam, examId, questions, submitting, submitted, user, userData]);

  useEffect(() => {
    if (!started) return;
    const limit = overrideTime !== null ? overrideTime : exam?.timeLimitMinutes;
    if (!limit) return;
    const totalSec = limit * 60;
    setSecondsLeft(totalSec);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); submitExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started]); // eslint-disable-line

  const setAnswer = (idx, val) => setAnswers(p => ({ ...p, [idx]: val }));
  const q = questions[currentIndex];

  if (!q && started && !submitted) return <div className="flex items-center justify-center min-h-screen text-gray-500">Error al cargar la pregunta actual.</div>;

  // ── Style helpers ─────────────────────────────────────────────────────────
  const card = `rounded-3xl border ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const btnPrimary = `flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  if (alreadyTaken) return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className={`${card} p-12 text-center max-w-md`}>
        <CheckCircle size={52} className="mx-auto text-green-500 mb-4" />
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ya completaste este examen</h2>
        <p className="text-gray-500">Tus resultados han sido enviados al profesor.</p>
        <button onClick={() => navigate(-1)} className={`mt-8 ${btnPrimary} mx-auto`}>Volver</button>
      </div>
    </div>
  );

  // ── Result screen ─────────────────────────────────────────────────────────
  if (submitted && result) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className={`${card} p-8 text-center mb-6`}>
          {result.needsManualGrading ? (
            <><AlertCircle size={48} className="mx-auto text-amber-400 mb-3" />
              <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Examen Enviado</h2>
              <p className="text-gray-500">Este examen tiene preguntas que serán calificadas por el profesor.</p></>
          ) : (
            <><div className={`text-6xl font-black mb-2 ${
                result.percentageScore <= 59 ? 'text-red-500' : 
                result.percentageScore <= 70 ? 'text-amber-500' : 
                'text-green-500'
              }`}>{result.percentageScore}%</div>
              <h2 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {result.percentageScore >= 71 ? '¡Excelente!' : result.percentageScore >= 60 ? 'Aprobado' : 'No Aprobado'}
              </h2>
              <p className="text-gray-500">{result.earnedPoints} / {result.totalPoints} puntos</p></>
          )}
        </div>
        {/* Detailed review removed for privacy/preventing copying */}
        <div className={`${card} p-8 text-center`}>
          <p className="text-sm text-gray-500 italic">
            El examen ha sido registrado correctamente. Los detalles han sido enviados a tu profesor para su revisión final.
          </p>
        </div>
        <button onClick={() => navigate(-1)} className={`mt-6 w-full py-4 ${btnPrimary}`}>Cerrar Examen</button>
      </div>
    );
  }

  // ── Start screen ─────────────────────────────────────────────────────────
  if (!started) return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className={`${card} p-10 max-w-lg w-full`}>
        <h1 className={`text-3xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exam?.title}</h1>
        {exam?.description && <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{exam.description}</p>}
        <div className="space-y-0 mb-8">
          {[
            ['Preguntas', `${questions.length}`],
            ['Tiempo Límite', overrideTime !== null ? `${overrideTime} minutos (Penalizado)` : (exam?.timeLimitMinutes ? `${exam.timeLimitMinutes} minutos` : 'Sin límite')],
            ['Puntos Totales', questions.reduce((s, q) => s + (q.points || 1), 0)],
          ].map(([k, v]) => (
            <div key={k} className={`flex justify-between py-3.5 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <span className="text-sm text-gray-500">{k}</span>
              <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setStarted(true)} className={`w-full py-4 ${btnPrimary}`}>Comenzar Examen <ChevronRight size={18} /></button>
      </div>
    </div>
  );

  // ── Exam screen ───────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
      {/* Top Bar */}
      <div className={`sticky top-0 z-30 border-b backdrop-blur-md ${isDarkMode ? 'bg-[#0b1120]/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{exam?.title}</span>
            <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pregunta {currentIndex + 1} de {questions.length}</div>
          </div>
          {exam?.timeLimitMinutes && secondsLeft !== null && (
            <Timer secondsLeft={secondsLeft} totalSeconds={exam.timeLimitMinutes * 60} />
          )}
        </div>
      </div>

      {/* Progress */}
      <div className={`h-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
        <div className={`h-1 transition-all duration-500 ${isDarkMode ? 'bg-cyan-500' : 'bg-indigo-600'}`} style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className={`${card} p-6 md:p-8`}>
          {/* Question header */}
          <div className="flex items-start gap-4 mb-8">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${isDarkMode ? 'bg-[#0b1120] text-cyan-400' : 'bg-indigo-50 text-indigo-600'}`}>{currentIndex + 1}</span>
            <div className="flex-1">
              {q.type === 'fillblank' ? (
                <>
                  <p className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completa el espacio en blanco:</p>
                  <FillBlank question={q} value={answers[currentIndex]} onChange={val => setAnswer(currentIndex, val)} isDarkMode={isDarkMode} />
                </>
              ) : (
                <p className={`text-lg font-semibold leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {q.type === 'imageidentify' && '📷 '}
                  {q.type === 'ordering' ? 'Ordena las palabras para formar la oración correcta:' : q.text}
                </p>
              )}
            </div>
          </div>

          {/* ── MULTIPLE CHOICE ── */}
          {q.type === 'multiple' && (
            <div className="space-y-3">
              {q.options.map((opt, oIdx) => (
                <button key={oIdx} type="button" onClick={() => setAnswer(currentIndex, oIdx)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                    answers[currentIndex] === oIdx
                      ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500' : 'bg-indigo-50 border-indigo-500')
                      : (isDarkMode ? 'border-gray-800 hover:border-gray-700' : 'border-gray-200 hover:border-gray-300')
                  }`}>
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${answers[currentIndex] === oIdx ? (isDarkMode ? 'bg-cyan-500 text-white' : 'bg-indigo-600 text-white') : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{opt}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── TRUE / FALSE ── */}
          {q.type === 'truefalse' && (
            <div className="grid grid-cols-2 gap-4">
              {[true, false].map(val => (
                <button key={String(val)} type="button" onClick={() => setAnswer(currentIndex, val)}
                  className={`py-6 rounded-2xl border text-lg font-black transition-all ${
                    answers[currentIndex] === val
                      ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300' : 'bg-indigo-50 border-indigo-500 text-indigo-700')
                      : (isDarkMode ? 'border-gray-800 text-gray-400 hover:border-gray-700' : 'border-gray-200 text-gray-500 hover:border-gray-300')
                  }`}>
                  {val ? '✓ Verdadero' : '✗ Falso'}
                </button>
              ))}
            </div>
          )}

          {/* ── SHORT ANSWER ── */}
          {q.type === 'short' && (
            <textarea rows={3} placeholder="Escribe tu respuesta aquí..."
              className={`w-full p-3 rounded-xl text-sm border focus:outline-none transition-all resize-none ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'}`}
              value={answers[currentIndex] || ''} onChange={e => setAnswer(currentIndex, e.target.value)}
            />
          )}

          {/* ── ORDERING (word bank) ── */}
          {q.type === 'ordering' && (
            <WordOrderWidget
              question={q}
              value={answers[currentIndex]}
              onChange={val => setAnswer(currentIndex, val)}
            />
          )}

          {/* ── IMAGE IDENTIFY ── */}
          {q.type === 'imageidentify' && (
            <div className="space-y-6">
              {q.imageUrl && (
                <div className={`rounded-2xl overflow-hidden border ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <img src={q.imageUrl} alt="Identificar" className="w-full max-h-72 object-contain mx-auto" />
                </div>
              )}
              <div>
                <p className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{q.text}</p>
                <input type="text" placeholder="Escribe tu respuesta aquí..."
                  className={`w-full p-3 rounded-xl text-sm border focus:outline-none transition-all ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-gray-200 placeholder-gray-600 focus:border-cyan-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'}`}
                  value={answers[currentIndex] || ''} onChange={e => setAnswer(currentIndex, e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 ${isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}>
            <ChevronLeft size={18} /> Anterior
          </button>

          <div className="flex gap-1 flex-wrap justify-center max-w-xs">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  i === currentIndex ? (isDarkMode ? 'bg-cyan-500 text-white' : 'bg-indigo-600 text-white') :
                  answers[i] !== undefined ? (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600') :
                  (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')
                }`}>
                {i + 1}
              </button>
            ))}
          </div>

          {currentIndex < questions.length - 1 ? (
            <button onClick={() => setCurrentIndex(p => p + 1)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}>
              Siguiente <ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={() => submitExam()} disabled={submitting}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff]' : 'bg-indigo-600'}`}>
              <Send size={16} /> {submitting ? 'Enviando...' : 'Entregar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
