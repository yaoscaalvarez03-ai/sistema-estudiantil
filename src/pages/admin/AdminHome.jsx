import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../supabase/client';
import { 
  Users, ClipboardList, BarChart3, TrendingUp, 
  Award, GraduationCap, School, CheckCircle2 
} from 'lucide-react';

const quickCards = [
  { title: 'Usuarios', desc: 'Gestiona administradores, docentes y estudiantes.', link: '/admin/users', label: 'Ir a Usuarios →', icon: <Users size={22} />, color: 'bg-blue-500/10 text-blue-400' },
  { title: 'Tareas y Pruebas', desc: 'Crea o asigna evaluaciones y sistemáticos.', link: '/admin/tasks', label: 'Administrar evaluaciones →', icon: <ClipboardList size={22} />, color: 'bg-emerald-500/10 text-emerald-400' },
  { title: 'Solicitudes', desc: 'Revisa y aprueba nuevos registros.', link: '/admin/requests', label: 'Ver solicitudes →', icon: <GraduationCap size={22} />, color: 'bg-purple-500/10 text-purple-400' },
];

export default function AdminHome() {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    exams: 0,
    avgScore: 0
  });
  const [topStudents, setTopStudents] = useState([]);
  const [examPerformance, setExamPerformance] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch Users from Supabase
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*');
        if (usersError) throw usersError;

        const studentsCount = users.filter(u => u.role === 'student').length;
        const teachersCount = users.filter(u => u.role === 'teacher').length;

        // 2. Fetch Exams (Handle table not existing yet)
        const { data: exams, error: examsError } = await supabase
          .from('exams')
          .select('*');
        const examsCount = exams?.length || 0;

        // 3. Fetch Results (Handle table not existing yet)
        const { data: results, error: resultsError } = await supabase
          .from('exam_results')
          .select('*');
        const allResults = results || [];

        // Process Global Average
        const validResults = allResults.filter(r => r.percentageScore != null);
        const globalAvg = validResults.length > 0
          ? Math.round(validResults.reduce((acc, r) => acc + r.percentageScore, 0) / validResults.length)
          : 0;

        // Process Top Students
        const studentStats = {};
        validResults.forEach(r => {
          if (!studentStats[r.userId]) {
            const user = users.find(u => u.id === r.userId);
            studentStats[r.userId] = { 
              name: r.userName || user?.nombres || 'Estudiante', 
              total: 0, 
              count: 0 
            };
          }
          studentStats[r.userId].total += r.percentageScore;
          studentStats[r.userId].count += 1;
        });
        
        const top5 = Object.values(studentStats)
          .map(s => ({ ...s, avg: Math.round(s.total / s.count) }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 5);

        // Process Exam Performance (Chart)
        const examStats = {};
        validResults.forEach(r => {
          const title = r.examTitle || 'Examen';
          if (!examStats[title]) examStats[title] = { title, total: 0, count: 0 };
          examStats[title].total += r.percentageScore;
          examStats[title].count += 1;
        });

        const performance = Object.values(examStats)
          .map(e => ({ ...e, avg: Math.round(e.total / e.count) }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 6);

        setStats({
          students: studentsCount,
          teachers: teachersCount,
          exams: examsCount,
          avgScore: globalAvg
        });
        setTopStudents(top5);
        setExamPerformance(performance);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const cardCls = `p-6 rounded-3xl border ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* Welcome Header */}
      <div>
        <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Dashboard Administrativo</h2>
        <p className={`text-sm mt-1 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Resumen analítico del rendimiento institucional.</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Estudiantes', value: stats.students, icon: <Users size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Docentes', value: stats.teachers, icon: <School size={20} />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Exámenes', value: stats.exams, icon: <ClipboardList size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Promedio Gral.', value: `${stats.avgScore}%`, icon: <TrendingUp size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(s => (
          <div key={s.label} className={cardCls}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
            <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {s.label}
            </div>
            <div className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart (Simplified Bar Chart) */}
        <div className={`${cardCls} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <BarChart3 size={18} className="text-cyan-400" /> Rendimiento por Examen
            </h3>
            <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Promedio %</span>
          </div>
          
          <div className="space-y-5">
            {examPerformance.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500 italic">No hay datos suficientes</div>
            ) : (
              examPerformance.map(e => (
                <div key={e.title} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold px-1">
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{e.title}</span>
                    <span className={isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}>{e.avg}%</span>
                  </div>
                  <div className={`h-2.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div 
                      className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                      style={{ width: `${e.avg}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Students Ranking */}
        <div className={cardCls}>
          <h3 className={`text-base font-bold flex items-center gap-2 mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Award size={18} className="text-amber-400" /> Mejores Estudiantes
          </h3>
          <div className="space-y-4">
            {topStudents.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500 italic">No hay datos suficientes</div>
            ) : (
              topStudents.map((s, idx) => (
                <div key={s.name} className={`flex items-center gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-500' :
                    idx === 1 ? 'bg-slate-400/20 text-slate-400' :
                    idx === 2 ? 'bg-orange-500/20 text-orange-500' :
                    'bg-gray-500/10 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{s.name}</div>
                    <div className="text-[10px] text-gray-500 font-medium uppercase">{s.count} exámenes realizados</div>
                  </div>
                  <div className={`text-sm font-black ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {s.avg}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {quickCards.map(card => (
          <div 
            key={card.title}
            className={`p-6 rounded-3xl border transition-all hover:shadow-xl hover:-translate-y-1 ${
              isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${card.color}`}>
              {card.icon}
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.title}</h3>
            <p className={`text-sm mb-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{card.desc}</p>
            <Link 
              to={card.link} 
              className={`text-sm font-bold flex items-center gap-2 hover:translate-x-1 transition-all ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}
            >
              {card.label}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
