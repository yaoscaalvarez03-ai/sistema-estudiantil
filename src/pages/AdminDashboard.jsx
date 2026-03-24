import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Existing Modules
import AdminHome from './admin/AdminHome';
import StudentManagement from './admin/StudentManagement';
import TaskManagement from './admin/TaskManagement';
import RegistrationRequests from './admin/RegistrationRequests';
import UserManagement from './admin/UserManagement';
import ClassManagement from './admin/ClassManagement';
import ExamBuilder from './admin/ExamBuilder';
import ExamResults from './admin/ExamResults';
import GroupManagement from './admin/GroupManagement';
import CareerManagement from './admin/CareerManagement';
import ChatMonitor from './admin/ChatMonitor';
import { useParams } from 'react-router-dom';

// Wrapper to pass examId from URL params to ExamResults
const ExamResultsPage = () => {
  const { examId } = useParams();
  return <ExamResults examId={examId} />;
};

// Wrapper to enable edit mode in ExamBuilder
const ExamEditPage = () => {
  const { examId } = useParams();
  return <ExamBuilder examId={examId} />;
};

// Placeholder for new modules
const Placeholder = ({ title }) => (
  <div className="p-6">
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-100 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-800 text-center p-8">
      <h1 className="text-2xl font-bold mb-2 dark:text-white">{title}</h1>
      <p className="text-gray-500 dark:text-gray-400">Este módulo está en construcción y será funcional pronto.</p>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { isDarkMode } = useTheme();

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0b1120]' : 'bg-gray-50'}`}>
      
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <main className={`transition-all duration-300 ${isMobile ? 'pl-0' : (sidebarOpen ? 'pl-64' : 'pl-20')}`}>
        
        {/* Mobile Header Toggle */}
        {isMobile && !sidebarOpen && (
          <div className={`sticky top-0 z-20 flex items-center h-16 px-4 border-b ${isDarkMode ? 'bg-[#0b1120]/80 border-gray-800' : 'bg-white/80 border-gray-200'} backdrop-blur-md`}>
            <button 
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Menu size={24} />
            </button>
            <span className={`ml-4 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Admin Panel
            </span>
          </div>
        )}

        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<AdminHome />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/requests" element={<RegistrationRequests />} />
            <Route path="/classes" element={<ClassManagement />} />
            <Route path="/groups" element={<GroupManagement />} />
            <Route path="/careers" element={<CareerManagement />} />
            <Route path="/tasks" element={<TaskManagement />} />
            <Route path="/tasks/new" element={<ExamBuilder />} />
            <Route path="/tasks/edit/:examId" element={<ExamEditPage />} />
            <Route path="/tasks/results/:examId" element={<ExamResultsPage />} />
            <Route path="/chat" element={<ChatMonitor />} />
            {/* Keeping students for compatibility during transition */}
            <Route path="/students" element={<StudentManagement />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
