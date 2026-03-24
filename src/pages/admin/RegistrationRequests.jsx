import { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../../firebase/config';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc,
  setDoc,
  updateDoc, 
  deleteDoc,
  getDocs,
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar, 
  Mail, 
  Phone, 
  User, 
  CreditCard,
  MapPin,
  Clock,
  Filter,
  Search
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function RegistrationRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isDarkMode } = useTheme();

  // Admin additional fields for approval
  const [approvalData, setApprovalData] = useState({
    carrera: '',
    turno: '',
    estadoAlumno: 'Activo',
    groupId: '',
  });
  const [careers, setCareers] = useState([]);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'registration_requests'), where('status', '==', 'pending'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.id && doc.data()
      }));
      setRequests(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load active careers and groups
  useEffect(() => {
    getDocs(query(collection(db, 'careers'), where('status', '==', 'active')))
      .then(snap => setCareers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(collection(db, 'groups'))
      .then(snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    if (!approvalData.carrera) return alert('Selecciona una carrera.');

    // La contraseña fue guardada en la solicitud al registrarse
    const password = selectedRequest.password;
    if (!password) {
      return alert('Esta solicitud no tiene contraseña guardada. El estudiante debe registrarse nuevamente.');
    }
    
    try {
      // 1. Verificar si el correo ya existe en Firestore para evitar duplicados
      const qUser = query(collection(db, 'users'), where('email', '==', selectedRequest.email.toLowerCase().trim()));
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        return alert(`El correo ${selectedRequest.email} ya está registrado en el sistema como ${snapUser.docs[0].data().role}. No se puede duplicar.`);
      }

      // 2. Crear cuenta en Firebase Auth usando secondaryAuth
      let uid;
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, selectedRequest.email, password);
        uid = cred.user.uid;
        await signOut(secondaryAuth);
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          const msg = `El correo ${selectedRequest.email} ya existe en la base de datos de seguridad (Firebase Auth).\n\nPara aprobar esta solicitud, primero debes verificar si hay un usuario antiguo con este correo y eliminarlo si es necesario desde la Consola de Firebase.\n\n¿Quieres abrir la consola ahora?`;
          if (window.confirm(msg)) {
            window.open('https://console.firebase.google.com/project/sistema-estudiantil-58bc2/authentication/users', '_blank');
          }
          throw new Error('El correo ya está en uso en Firebase Auth.');
        } else {
          throw error;
        }
      }

      // 2. Crear documento en 'users' usando el UID real de Firebase Auth
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: selectedRequest.email,
        displayName: `${selectedRequest.nombres} ${selectedRequest.apellidos}`,
        role: 'student',
        active: true,
        _currentPw: password,
        nombres: selectedRequest.nombres,
        apellidos: selectedRequest.apellidos,
        cedula: selectedRequest.cedula,
        genero: selectedRequest.genero,
        fechaNacimiento: selectedRequest.fechaNacimiento,
        celular1: selectedRequest.celular1,
        celular2: selectedRequest.celular2 || '',
        direccion: selectedRequest.direccion,
        carrera: approvalData.carrera,
        turno: approvalData.turno,
        estadoAlumno: approvalData.estadoAlumno,
        groupId: approvalData.groupId || null,
        approvedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // 3. Agregar al grupo seleccionado
      if (approvalData.groupId) {
        await updateDoc(doc(db, 'groups', approvalData.groupId), {
          studentIds: arrayUnion(uid)
        });
      }

      // 4. Marcar solicitud como aprobada
      await updateDoc(doc(db, 'registration_requests', selectedRequest.id), {
        status: 'approved',
        approvedUid: uid,
        processedAt: serverTimestamp()
      });

      setIsApproveModalOpen(false);
      setSelectedRequest(null);
      setApprovalData({ carrera: '', turno: '', estadoAlumno: 'Activo', groupId: '' });
      alert('✅ Estudiante aprobado. Ya puede iniciar sesión con sus credenciales.');
    } catch (error) {
      console.error('Error approving request:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Este correo ya tiene una cuenta en el sistema. El estudiante puede intentar iniciar sesión directamente.');
      } else {
        alert('Error al procesar la aprobación: ' + error.message);
      }
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('¿Estás seguro de rechazar esta solicitud?')) return;
    
    try {
      await updateDoc(doc(db, 'registration_requests', id), {
        status: 'rejected',
        processedAt: serverTimestamp()
      });
      alert('Solicitud rechazada.');
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.cedula.includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Solicitudes de Registro</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Revisa y aprueba el ingreso de nuevos estudiantes.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o cédula..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 pr-4 py-2.5 rounded-xl text-sm w-full md:w-80 focus:outline-none transition-all ${
              isDarkMode 
                ? 'bg-[#151c2c] border-gray-800 text-white focus:border-cyan-500/50' 
                : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
            } border shadow-sm`}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando solicitudes...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <User size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No hay solicitudes pendientes en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredRequests.map((request) => (
            <div 
              key={request.id} 
              className={`p-6 rounded-3xl border transition-all hover:shadow-xl ${
                isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${
                    isDarkMode ? 'bg-[#0f172a] text-cyan-400 border border-cyan-500/30' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {request.nombres[0]}
                  </div>
                  <div className="ml-4">
                    <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {request.nombres} {request.apellidos}
                    </h3>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <CreditCard size={14} className="mr-1" />
                      {request.cedula}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => { 
                      setSelectedRequest(request); 
                      setApprovalData(prev => ({ ...prev, groupId: request.groupId || '' }));
                      setIsApproveModalOpen(true); 
                    }}
                    className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all"
                    title="Aprobar"
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button 
                    onClick={() => handleReject(request.id)}
                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                    title="Rechazar"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-2 border-t border-gray-800/10 dark:border-gray-800/50 pt-4">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Mail size={16} className="mr-2 shrink-0" />
                  <span className="truncate">{request.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Phone size={16} className="mr-2 shrink-0" />
                  <span>{request.celular1}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar size={16} className="mr-2 shrink-0" />
                  <span>{request.fechaNacimiento}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                   <Clock size={16} className="mr-2 shrink-0" />
                   <span>Pendiente</span>
                </div>
              </div>

              <div className="mt-4 flex items-start text-xs text-gray-400 bg-gray-50 dark:bg-black/20 p-3 rounded-xl">
                 <MapPin size={14} className="mr-2 mt-0.5 shrink-0" />
                 <p className="line-clamp-2">{request.direccion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
             <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Completar Perfil Estudiantil</h2>
             
             <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase">Carrera</label>
                  <select
                    value={approvalData.carrera}
                    onChange={(e) => setApprovalData({...approvalData, carrera: e.target.value})}
                    className={`w-full p-3 rounded-xl text-sm focus:outline-none transition-all ${
                      isDarkMode ? 'bg-[#0b1120] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                    } border appearance-none`}
                  >
                    <option value="">-- Seleccionar Carrera --</option>
                    {careers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {careers.length === 0 && (
                    <p className="text-xs text-amber-500 mt-1">⚠ No hay carreras activas. Crea una en el módulo Carreras.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase">Turno</label>
                  <select 
                    value={approvalData.turno}
                    onChange={(e) => setApprovalData({...approvalData, turno: e.target.value})}
                    className={`w-full p-3 rounded-xl text-sm focus:outline-none transition-all ${
                      isDarkMode ? 'bg-[#0b1120] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                    } border appearance-none`}
                  >
                    <option value="">Seleccionar Turno</option>
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Nocturno">Nocturno</option>
                    <option value="Sabatino">Sabatino</option>
                    <option value="Dominical">Dominical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase">Estado Inicial</label>
                  <select 
                    value={approvalData.estadoAlumno}
                    onChange={(e) => setApprovalData({...approvalData, estadoAlumno: e.target.value})}
                    className={`w-full p-3 rounded-xl text-sm focus:outline-none transition-all ${
                      isDarkMode ? 'bg-[#0b1120] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                    } border appearance-none`}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase">Grupo (opcional)</label>
                  <select 
                    value={approvalData.groupId}
                    onChange={(e) => setApprovalData({...approvalData, groupId: e.target.value})}
                    className={`w-full p-3 rounded-xl text-sm focus:outline-none transition-all ${
                      isDarkMode ? 'bg-[#0b1120] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                    } border appearance-none`}
                  >
                    <option value="">-- Sin grupo por ahora --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({(g.studentIds||[]).length} alumnos)</option>
                    ))}
                  </select>
                </div>
             </div>

             <div className="mt-8 flex space-x-3">
                <button 
                  onClick={() => setIsApproveModalOpen(false)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleApprove}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${
                    isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Confirmar Ingreso
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
