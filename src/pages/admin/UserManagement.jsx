import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, arrayRemove, arrayUnion, query, where, getDocs
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { db, secondaryAuth, functions } from '../../firebase/config';
import * as XLSX from 'xlsx';
import {
  UserPlus, Search, Trash2, Shield, GraduationCap, UserCircle,
  Mail, X, Edit2, Power, Download, ChevronDown
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

function StudentCard({ user, isDarkMode, card, setEditUser, handleToggle, handleDelete }) {
  const badge = getRoleBadge(user.role, isDarkMode);
  const isInactive = user.active === false;
  const initials = (user.displayName || user.nombres || user.email || 'U')[0].toUpperCase();
  return (
    <div className={`${card} ${isInactive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${isDarkMode ? 'bg-[#0b1120] text-cyan-400' : 'bg-indigo-100 text-indigo-600'}`}>
            {initials}
          </div>
          <div>
            <div className={`text-sm font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {user.displayName || (user.nombres ? `${user.nombres} ${user.apellidos}` : <span className="text-gray-400 italic">Sin nombre</span>)}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[140px]">{user.email}</div>
          </div>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${isInactive ? (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400') : (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700')}`}>
          {isInactive ? 'Inactivo' : 'Activo'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${badge.cls}`}>
          {badge.icon} {ROLE_LABEL[user.role] || user.role}
        </span>
        {user.carrera && (
          <span className="text-xs text-gray-400 truncate">{user.carrera}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <button onClick={() => setEditUser(user)}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Edit2 size={13} /> Editar
        </button>
        <button onClick={() => handleToggle(user)}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isInactive
            ? (isDarkMode ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100')
            : (isDarkMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100')}`}>
          <Power size={13} /> {isInactive ? 'Activar' : 'Pausar'}
        </button>
        <button onClick={() => handleDelete(user)}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_LABEL = { student: 'Alumno', teacher: 'Docente', admin: 'Admin' };

function getRoleBadge(role, isDarkMode) {
  switch (role) {
    case 'admin':   return { cls: isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-700', icon: <Shield size={12} /> };
    case 'teacher': return { cls: isDarkMode ? 'bg-blue-500/10 text-blue-400'    : 'bg-blue-100 text-blue-700',   icon: <GraduationCap size={12} /> };
    default:        return { cls: isDarkMode ? 'bg-green-500/10 text-green-400'  : 'bg-green-100 text-green-700', icon: <UserCircle size={12} /> };
  }
}

// ── Export to XLSX ────────────────────────────────────────────────────────────
const ROLE_FIELDS = {
  admin: [
    { key: 'displayName', label: 'Nombre' },
    { key: 'email',       label: 'Correo' },
    { key: 'role',        label: 'Rol' },
    { key: 'active',      label: 'Estado', fn: v => (v === false ? 'Inactivo' : 'Activo') },
    { key: 'createdAt',   label: 'Fecha Creación', fn: v => v?.toDate ? v.toDate().toLocaleDateString() : (v ? new Date(v).toLocaleDateString() : '') },
  ],
  teacher: [
    { key: 'displayName', label: 'Nombre' },
    { key: 'email',       label: 'Correo' },
    { key: 'role',        label: 'Rol' },
    { key: 'active',      label: 'Estado', fn: v => (v === false ? 'Inactivo' : 'Activo') },
    { key: 'createdAt',   label: 'Fecha Creación', fn: v => v?.toDate ? v.toDate().toLocaleDateString() : (v ? new Date(v).toLocaleDateString() : '') },
  ],
  student: [
    { key: 'nombres',        label: 'Nombres' },
    { key: 'apellidos',      label: 'Apellidos' },
    { key: 'email',          label: 'Correo' },
    { key: 'cedula',         label: 'Cédula' },
    { key: 'genero',         label: 'Género' },
    { key: 'fechaNacimiento',label: 'Fecha Nacimiento' },
    { key: 'celular1',       label: 'Celular 1' },
    { key: 'celular2',       label: 'Celular 2' },
    { key: 'direccion',      label: 'Dirección' },
    { key: 'carrera',        label: 'Carrera' },
    { key: 'turno',          label: 'Turno' },
    { key: 'estadoAlumno',   label: 'Estado Alumno' },
    { key: 'active',         label: 'Acceso', fn: v => (v === false ? 'Inactivo' : 'Activo') },
    { key: 'approvedAt',     label: 'Fecha Aprobación', fn: v => v?.toDate ? v.toDate().toLocaleDateString() : (v ? new Date(v).toLocaleDateString() : '') },
  ],
};

function exportXLSX(users, role) {
  const fields = ROLE_FIELDS[role] || ROLE_FIELDS.admin;
  const filtered = users.filter(u => u.role === role);
  const data = filtered.map(u => {
    const row = {};
    fields.forEach(f => { row[f.label] = f.fn ? f.fn(u[f.key]) : (u[f.key] ?? ''); });
    return row;
  });
  if (data.length === 0) { alert('No hay usuarios con ese rol para exportar.'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, ROLE_LABEL[role]);
  XLSX.writeFile(wb, `Usuarios_${ROLE_LABEL[role]}_${new Date().toLocaleDateString('es')}.xlsx`);
}

// ── Export Role Picker Modal ──────────────────────────────────────────────────
function ExportModal({ users, isDarkMode, onClose }) {
  const [selectedRole, setSelectedRole] = useState('student');

  const countFor = (r) => users.filter(u => u.role === r).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className={`w-full max-w-sm p-8 rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Exportar a Excel</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={22} /></button>
        </div>
        <p className={`text-sm mb-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Selecciona el rol que deseas descargar. Cada rol tiene sus propios campos.</p>
        <div className="space-y-3 mb-8">
          {[
            { value: 'student', label: 'Alumnos', desc: 'Datos completos del perfil estudiantil', icon: <UserCircle size={18} />, color: isDarkMode ? 'text-green-400' : 'text-green-600' },
            { value: 'teacher', label: 'Docentes', desc: 'Nombre, correo y acceso', icon: <GraduationCap size={18} />, color: isDarkMode ? 'text-blue-400' : 'text-blue-600' },
            { value: 'admin',   label: 'Administradores', desc: 'Nombre, correo y acceso', icon: <Shield size={18} />, color: isDarkMode ? 'text-purple-400' : 'text-purple-600' },
          ].map(opt => (
            <button key={opt.value} type="button" onClick={() => setSelectedRole(opt.value)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                selectedRole === opt.value
                  ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-indigo-50 border-indigo-300')
                  : (isDarkMode ? 'border-gray-800 hover:border-gray-700' : 'border-gray-200 hover:border-gray-300')
              }`}>
              <span className={opt.color}>{opt.icon}</span>
              <div className="flex-1">
                <div className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                {countFor(opt.value)}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-gray-500 hover:bg-gray-100'}`}>
            Cancelar
          </button>
          <button onClick={() => { exportXLSX(users, selectedRole); onClose(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            <Download size={16} /> Descargar .xlsx
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ user, isDarkMode, onClose }) {
  const isDetailedRole = user.role === 'student' || user.role === 'teacher';
  const [data, setData] = useState({
    displayName: user.displayName || '',
    nombres:     user.nombres || '',
    apellidos:   user.apellidos || '',
    email:       user.email || '',
    role:        user.role || 'student',
    cedula:      user.cedula || '',
    genero:      user.genero || '',
    fechaNacimiento: user.fechaNacimiento || '',
    celular1:    user.celular1 || '',
    celular2:    user.celular2 || '',
    direccion:   user.direccion || '',
    carrera:     user.carrera || '',
    turno:       user.turno || '',
    estadoAlumno: user.estadoAlumno || 'Activo',
    groupId:      user.groupId || '',
  });
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    getDocs(collection(db, 'groups')).then(snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);
  const [newPassword, setNewPassword]   = useState('');
  const [resetSent, setResetSent]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [pwSaving, setPwSaving]         = useState(false);
  const [pwSuccess, setPwSuccess]       = useState(false);
  const [pwError, setPwError]           = useState('');

  const inp  = `w-full p-3 rounded-xl text-sm border focus:outline-none transition-all ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-gray-200 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
  const lbl  = `block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;
  const sel  = `${inp} appearance-none`;

  const set = (k, v) => setData(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        role: data.role, updatedAt: serverTimestamp(),
        ...(isDetailedRole
          ? { nombres: data.nombres, apellidos: data.apellidos, cedula: data.cedula, genero: data.genero,
              fechaNacimiento: data.fechaNacimiento, celular1: data.celular1, celular2: data.celular2,
              direccion: data.direccion, carrera: data.carrera || '', turno: data.turno || '', estadoAlumno: data.estadoAlumno || 'Activo',
              groupId: data.groupId || null,
              email: data.email,
              displayName: `${data.nombres} ${data.apellidos}`.trim() || data.displayName }
          : { displayName: data.displayName, email: data.email }
        ),
      };

      // Si el email cambió, llamar a la Cloud Function para actualizar Auth
      if (data.email !== user.email) {
        // Verificar si el nuevo correo ya existe en Firestore para otro usuario
        const qEmail = query(collection(db, 'users'), where('email', '==', data.email.toLowerCase().trim()));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          throw new Error('Este correo ya pertenece a otro usuario registrado.');
        }

        const changeEmailFn = httpsCallable(functions, 'changeUserEmail');
        await changeEmailFn({ uid: user.uid, newEmail: data.email });
      }

      // Manejar cambio de grupo en la colección 'groups' (solo para estudiantes)
      if (user.role === 'student' && data.groupId !== user.groupId) {
        if (user.groupId) {
          await updateDoc(doc(db, 'groups', user.groupId), { studentIds: arrayRemove(user.uid) });
        }
        // Agregar a grupo nuevo
        if (data.groupId) {
          await updateDoc(doc(db, 'groups', data.groupId), { studentIds: arrayUnion(user.uid) });
        }
      }

      await updateDoc(doc(db, 'users', user.uid), payload);
      onClose();
    } catch (err) { 
      console.error(err); 
      let msg = 'Error al guardar los cambios.';
      if (err.code === 'functions/not-found' || err.code === 'functions/internal') {
        msg = 'Error de servidor: No se pudo actualizar el correo. Asegúrate de estar en el plan Blaze y haber desplegado las funciones.';
      } else if (err.message) {
        msg = err.message;
      }
      alert(msg); 
    }
    finally { setSaving(false); }
  };

  // Robusto cambio de contraseña vía Cloud Function (evita bloqueos de seguridad)
  const handleChangePassword = async () => {
    setPwError('');
    if (newPassword.length < 6) { setPwError('La contraseña debe tener al menos 6 caracteres.'); return; }
    
    setPwSaving(true);
    try {
      // 1. Llamar a la Cloud Function para el cambio forzado (bypass Auth security rules)
      const changePasswordFn = httpsCallable(functions, 'changeUserPassword');
      const result = await changePasswordFn({
        uid: user.uid,
        newPassword: newPassword
      });

      if (result.data.success) {
        // 2. Actualizar la referencia de la clave en Firestore para el administrador
        await updateDoc(doc(db, 'users', user.uid), { 
          _currentPw: newPassword,
          lastPasswordChange: serverTimestamp()
        });
        
        setPwSuccess(true);
        setNewPassword('');
      }
    } catch (err) {
      console.error(err);
      // Manejo específico si el usuario no existe en Auth (cuenta huérfana)
      if (err.code === 'functions/not-found') {
        setPwError('La función de servidor no se encuentra. Asegúrate de haber desplegado las funciones (Firebase Blaze plan requerido).');
      } else if (err.code === 'functions/internal') {
        setPwError('Error interno del servidor. Esto suele ocurrir si el proyecto no tiene el plan Blaze habilitado para ejecutar funciones.');
      } else {
        setPwError(err.message || 'Error al cambiar la contraseña.');
        alert(`Error técnico: ${err.code} - ${err.message}`);
      }
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className={`w-full max-w-2xl flex flex-col max-h-[90vh] rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-4 shrink-0">
          <div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Editar Usuario</h3>
            <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={22} /></button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-8 pb-4">
          {/* Role selector */}
          <div className="mb-5">
            <label className={lbl}>Rol</label>
            <select className={sel} value={data.role} onChange={e => set('role', e.target.value)}>
              <option value="student">Alumno</option>
              <option value="teacher">Docente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="mb-5">
            <label className={lbl}>Correo Electrónico</label>
            <input 
              type="email" 
              className={inp} 
              value={data.email} 
              onChange={e => set('email', e.target.value)} 
              placeholder="usuario@ejemplo.com"
            />
            <p className="text-[10px] text-gray-500 mt-1 italic">
              Nota: Cambiar el correo aquí también actualizará las credenciales de inicio de sesión del usuario.
            </p>
          </div>

          {isDetailedRole ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className={lbl}>Nombres</label><input className={inp} value={data.nombres} onChange={e => set('nombres', e.target.value)} /></div>
                <div><label className={lbl}>Apellidos</label><input className={inp} value={data.apellidos} onChange={e => set('apellidos', e.target.value)} /></div>
                <div><label className={lbl}>Cédula de Identidad</label><input className={inp} placeholder="XXX-XXXXXX-XXXXX" value={data.cedula} onChange={e => set('cedula', e.target.value)} /></div>
                <div>
                  <label className={lbl}>Género</label>
                  <select className={sel} value={data.genero} onChange={e => set('genero', e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="Varón">Varón</option>
                    <option value="Mujer">Mujer</option>
                  </select>
                </div>
                <div><label className={lbl}>Fecha de Nacimiento</label><input type="date" className={inp} value={data.fechaNacimiento} onChange={e => set('fechaNacimiento', e.target.value)} /></div>
                <div><label className={lbl}>Celular Principal</label><input className={inp} placeholder="+505" value={data.celular1} onChange={e => set('celular1', e.target.value)} /></div>
                <div><label className={lbl}>Celular 2 (opcional)</label><input className={inp} placeholder="+505" value={data.celular2} onChange={e => set('celular2', e.target.value)} /></div>
                
                {user.role === 'student' && (
                  <>
                    <div>
                      <label className={lbl}>Turno</label>
                      <select className={sel} value={data.turno} onChange={e => set('turno', e.target.value)}>
                        <option value="">Seleccionar</option>
                        {['Matutino','Vespertino','Nocturno','Sabatino','Dominical'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><label className={lbl}>Carrera</label><input className={inp} value={data.carrera} onChange={e => set('carrera', e.target.value)} /></div>
                    <div>
                      <label className={lbl}>Estado</label>
                      <select className={sel} value={data.estadoAlumno} onChange={e => set('estadoAlumno', e.target.value)}>
                        <option>Activo</option><option>Inactivo</option><option>Egresado</option><option>Suspendido</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Grupo</label>
                      <select className={sel} value={data.groupId} onChange={e => set('groupId', e.target.value)}>
                        <option value="">Sin Grupo</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="mb-4">
                <label className={lbl}>Dirección Domiciliar</label>
                <textarea rows={2} className={`${inp} resize-none`} value={data.direccion} onChange={e => set('direccion', e.target.value)} />
              </div>
            </>
          ) : (
            <div className="mb-4">
              <label className={lbl}>Nombre Completo</label>
              <input className={inp} value={data.displayName} onChange={e => set('displayName', e.target.value)} />
            </div>
          )}

          {/* Password section — direct change via secondaryAuth */}
          <div className={`rounded-2xl border p-4 mb-2 ${isDarkMode ? 'border-gray-800 bg-[#0b1120]' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Cambiar Contraseña</p>
            {pwSuccess ? (
              <p className="text-xs text-green-500 font-semibold">✅ Contraseña cambiada exitosamente.</p>
            ) : (
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Nueva contraseña (mínimo 6 caracteres)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={inp}
                />
                {pwError && <p className="text-xs text-red-400">{pwError}</p>}
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={pwSaving || newPassword.length < 6}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${
                    isDarkMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {pwSaving ? 'Cambiando...' : '🔒 Cambiar Contraseña'}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Si el estudiante es de una versión anterior y dice "contraseña incorrecta" en su login, cambiarla aquí reparará su cuenta automáticamente.
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-4 p-8 pt-4 shrink-0">
          <button type="button" onClick={onClose}
            className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-gray-500 hover:bg-gray-100'}`}>Cancelar</button>
          <button type="button" onClick={e => { const form = e.target.closest('.fixed').querySelector('form'); form && form.requestSubmit(); }} disabled={saving}
            className={`flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function UserManagement() {
  const { isDarkMode } = useTheme();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchTerm, setSearch]   = useState('');
  const [roleFilter, setRole]     = useState('all');
  const [showCreate, setShowCreate]   = useState(false);
  const [showExport, setShowExport]   = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [formError, setFormError]     = useState('');
  const [createData, setCreateData]   = useState({ name: '', email: '', password: '', role: 'student', groupId: '' });
  const [groups, setGroups]           = useState([]);

  useEffect(() => {
    getDocs(collection(db, 'groups')).then(snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      // Importante: El spread de d.data() se hace ANTES de uid: d.id
      // para evitar que datos erróneos (uid: null) sobreescriban el valor real
      setUsers(snap.docs.map(d => ({ ...d.data(), uid: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setFormError(''); setSubmitting(true);
    try {
      // Verificar si el correo ya está en uso en Firestore
      const qEmail = query(collection(db, 'users'), where('email', '==', createData.email.toLowerCase().trim()));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        throw new Error('El correo ya está registrado en el sistema.');
      }

      const cred = await createUserWithEmailAndPassword(secondaryAuth, createData.email, createData.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: createData.name, email: createData.email,
        role: createData.role, active: true,
        groupId: createData.groupId || null,
        _currentPw: createData.password, // Stored for admin password change
        createdAt: serverTimestamp(),
      });
      if (createData.groupId) {
        await updateDoc(doc(db, 'groups', createData.groupId), { studentIds: arrayUnion(cred.user.uid) });
      }
      await signOut(secondaryAuth);
      setCreateData({ name: '', email: '', password: '', role: 'student', groupId: '' });
      setShowCreate(false);
    } catch (e) { 
      setFormError(e.message || 'Error al crear usuario. Verifica el correo o que la contraseña tenga 6+ caracteres.'); 
    }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (user) => {
    try { await updateDoc(doc(db, 'users', user.uid), { active: user.active === false ? true : false }); }
    catch (e) { console.error(e); }
  };
  const handleDelete = async (user) => {
    if (!window.confirm(`¿Eliminar definitivamente a ${user.email} del sistema?`)) return;
    
    // Attempt Auth deletion
    try {
      const { signInWithEmailAndPassword, deleteUser, signOut: fbSignOut } = await import('firebase/auth');
      
      let currentPwToTry = user._currentPw;
      if (!currentPwToTry) {
        const q = query(collection(db, 'registration_requests'), where('email', '==', user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          currentPwToTry = snap.docs[0].data().password;
        }
      }

      if (!currentPwToTry) {
         currentPwToTry = window.prompt(`Para borrar la cuenta Auth de ${user.email}, necesitamos su contraseña actual.\nSi no la tienes, el usuario se borrará solo localmente pero su correo seguirá bloqueado en Firebase Auth.\n\nContraseña del usuario (dejar vacío para saltar el borrado en Auth):`);
      }

      if (currentPwToTry) {
         try {
           const cred = await signInWithEmailAndPassword(secondaryAuth, user.email, currentPwToTry);
           await deleteUser(cred.user);
           await fbSignOut(secondaryAuth);
         } catch(e) {
           console.error("No se pudo borrar de Auth:", e);
           const forceLocal = window.confirm(`No se pudo eliminar de Firebase Auth (Error: ${e.code}).\n¿Deseas forzar la eliminación de sus datos locales de todos modos? (El correo seguirá en uso en Auth).`);
           if (!forceLocal) return;
         }
      } else {
         const forceLocal = window.confirm('No ingresaste contraseña para borrar su cuenta en Auth.\n¿Estás seguro de que quieres borrar solo los datos locales?');
         if (!forceLocal) return;
      }
      
      // Eliminar de Firestore
      await deleteDoc(doc(db, 'users', user.uid)); 
      
      // Eliminar también del grupo si tiene uno asignado
      if (user.groupId) {
         await updateDoc(doc(db, 'groups', user.groupId), {
            studentIds: arrayRemove(user.uid)
         });
      }
      
    } catch (e) { 
      console.error(e); 
      const msg = `No se pudo eliminar de la base de datos de seguridad (Firebase Auth).\n\nCausa probable: Se requiere una sesión reciente (por seguridad) o la contraseña ha cambiado.\n\nPara que este alumno pueda registrarse de nuevo, borra su correo (${user.email}) directamente desde la Consola de Firebase.\n\n¿Quieres abrir la consola ahora?`;
      if (window.confirm(msg)) {
         window.open('https://console.firebase.google.com/project/sistema-estudiantil-58bc2/authentication/users', '_blank');
      }
    }
  };

  const filtered = users.filter(u => {
    const s = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return s && (roleFilter === 'all' || u.role === roleFilter);
  });

  const card = `rounded-3xl border p-5 flex flex-col gap-4 transition-all ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const inp  = `w-full p-3.5 rounded-2xl text-sm focus:outline-none transition-all border shadow-sm ${isDarkMode ? 'bg-[#0b1120] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
  const lbl  = 'text-xs font-bold text-gray-500 uppercase tracking-wider';

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Gestión de Usuarios</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Crea y administra administradores, docentes y estudiantes.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearch(e.target.value)}
              className={`pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all border w-full md:w-52 shadow-sm ${isDarkMode ? 'bg-[#151c2c] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`} />
          </div>
          <button onClick={() => setShowExport(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${isDarkMode ? 'border-gray-800 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
            <Download size={18} /> Exportar .xlsx
          </button>
          <button onClick={() => setShowCreate(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            <UserPlus size={18} /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Role filters */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-1">
        {['all','admin','teacher','student'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              roleFilter === r
                ? (isDarkMode ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-indigo-600 border-indigo-600 text-white')
                : (isDarkMode ? 'bg-[#151c2c] border-gray-800 text-gray-400 hover:border-gray-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')
            }`}>
            {r === 'all' ? 'Ver Todos' : { admin:'Admin', teacher:'Teacher', student:'Student' }[r]}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <UserCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No se encontraron usuarios.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {roleFilter !== 'student' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(user => {
                const badge = getRoleBadge(user.role, isDarkMode);
                const isInactive = user.active === false;
                const initials = (user.displayName || user.nombres || user.email || 'U')[0].toUpperCase();
                return (
                  <div key={user.uid} className={`${card} ${isInactive ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${isDarkMode ? 'bg-[#0b1120] text-cyan-400' : 'bg-indigo-100 text-indigo-600'}`}>
                          {initials}
                        </div>
                        <div>
                          <div className={`text-sm font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {user.displayName || (user.nombres ? `${user.nombres} ${user.apellidos}` : <span className="text-gray-400 italic">Sin nombre</span>)}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[140px]">{user.email}</div>
                        </div>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${isInactive ? (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400') : (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700')}`}>
                        {isInactive ? 'Inactivo' : 'Activo'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${badge.cls}`}>
                        {badge.icon} {ROLE_LABEL[user.role] || user.role}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button onClick={() => setEditUser(user)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <Edit2 size={13} /> Editar
                      </button>
                      <button onClick={() => handleToggle(user)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isInactive
                          ? (isDarkMode ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100')
                          : (isDarkMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100')}`}>
                        <Power size={13} /> {isInactive ? 'Activar' : 'Pausar'}
                      </button>
                      <button onClick={() => handleDelete(user)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {groups.map(group => {
                const groupStudents = filtered.filter(u => u.groupId === group.id);
                if (groupStudents.length === 0) return null;
                return (
                  <div key={group.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-px flex-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                      <h2 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-cyan-400/80' : 'text-indigo-600/80'}`}>
                        Grupo: {group.name} ({groupStudents.length})
                      </h2>
                      <div className={`h-px flex-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {groupStudents.map(user => (
                        <StudentCard key={user.uid} user={user} isDarkMode={isDarkMode} card={card} setEditUser={setEditUser} handleToggle={handleToggle} handleDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Alumnos sin grupo */}
              {filtered.filter(u => !u.groupId).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-px flex-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                    <h2 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-amber-500/80' : 'text-amber-600/80'}`}>
                      Estudiantes sin Grupo ({filtered.filter(u => !u.groupId).length})
                    </h2>
                    <div className={`h-px flex-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.filter(u => !u.groupId).map(user => (
                      <StudentCard key={user.uid} user={user} isDarkMode={isDarkMode} card={card} setEditUser={setEditUser} handleToggle={handleToggle} handleDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className={`w-full max-w-lg p-8 rounded-[2rem] shadow-2xl relative ${isDarkMode ? 'bg-[#151c2c]' : 'bg-white'}`}>
            <button onClick={() => setShowCreate(false)} className="absolute top-6 right-6 text-gray-500 hover:text-gray-300"><X size={24} /></button>
            <h2 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Crear Nuevo Acceso</h2>
            <p className="text-sm text-gray-500 mb-8">Define el rol y las credenciales del nuevo integrante.</p>
            <form onSubmit={handleCreate} className="space-y-5">
              {formError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={lbl}>Nombre Completo</label>
                  <input type="text" required className={inp} placeholder="Ej. Juan Pérez"
                    value={createData.name} onChange={e => setCreateData({ ...createData, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <select className={`${inp} appearance-none`} value={createData.role} onChange={e => setCreateData({ ...createData, role: e.target.value })}>
                    <option value="student">Alumno</option>
                    <option value="teacher">Docente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {createData.role === 'student' && (
                  <div className="space-y-1.5">
                    <label className={lbl}>Grupo (Opcional)</label>
                    <select className={`${inp} appearance-none`} value={createData.groupId} onChange={e => setCreateData({ ...createData, groupId: e.target.value })}>
                      <option value="">Sin Grupo</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className={`${lbl} flex items-center gap-1`}><Mail size={12} /> Correo Electrónico</label>
                <input type="email" required className={inp} placeholder="usuario@colegio.com"
                  value={createData.email} onChange={e => setCreateData({ ...createData, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className={lbl}>Contraseña Temporal</label>
                <input type="password" required minLength="6" className={inp} placeholder="Mínimo 6 caracteres"
                  value={createData.password} onChange={e => setCreateData({ ...createData, password: e.target.value })} />
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setShowCreate(false)}
                  className={`flex-1 py-4 rounded-2xl text-sm font-bold transition-all ${isDarkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-gray-500 hover:bg-gray-50'}`}>Cancelar</button>
                <button type="submit" disabled={isSubmitting}
                  className={`flex-1 py-4 rounded-2xl text-sm font-bold text-white shadow-xl transition-all disabled:opacity-50 ${isDarkMode ? 'bg-[#007aff] hover:bg-[#0062cc]' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {isSubmitting ? 'Procesando...' : 'Crear Acceso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {showExport && <ExportModal users={users} isDarkMode={isDarkMode} onClose={() => setShowExport(false)} />}

      {/* ── Edit Modal ── */}
      {editUser && <EditModal user={editUser} isDarkMode={isDarkMode} onClose={() => setEditUser(null)} />}
    </div>
  );
}
