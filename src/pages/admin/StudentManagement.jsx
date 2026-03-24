import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '../../firebase/config';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const querySnapshot = await getDocs(q);
      const studentsData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      // 1. Crear en Firebase Auth usando secondaryAuth para no desloguear al admin
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const newUserId = userCredential.user.uid;

      // 2. Crear documento de usuario en Firestore
      await setDoc(doc(db, 'users', newUserId), {
        name: formData.name,
        email: formData.email,
        role: 'student',
        createdAt: new Date().toISOString()
      });

      // 3. Cerrar sesión en la secondary auth para dejarla limpia
      await signOut(secondaryAuth);

      // 4. Actualizar tabla y cerrar modal
      setFormData({ name: '', email: '', password: '' });
      setShowModal(false);
      fetchStudents();
    } catch (error) {
      console.error(error);
      setFormError('Error al crear estudiante. La contraseña debe tener al menos 6 caracteres o el correo ya existe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (uid) => {
    if (!window.confirm("¿Seguro que deseas eliminar el acceso a este estudiante?")) return;
    
    try {
      // Se elimina el documento de firestore. Nota: El usuario de Auth 
      // seguirá existiendo en Firebase, pero al no tener documento, perderá el acceso a la app.
      await deleteDoc(doc(db, 'users', uid));
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Error al eliminar estudiante");
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold text-gray-900">Listado de Estudiantes</h2>
          <p className="mt-2 text-sm text-gray-700">Lista completa de los alumnos registrados en el sistema.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none sm:w-auto"
          >
            Añadir estudiante
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-gray-500">Cargando estudiantes...</div>
      ) : (
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Nombre del Estudiante</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Correo Electrónico</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fecha de Registro</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {students.length === 0 ? (
                       <tr>
                          <td colSpan="4" className="py-4 text-center text-sm text-gray-500">
                             No hay estudiantes registrados.
                          </td>
                       </tr>
                    ) : (
                       students.map((student) => (
                         <tr key={student.uid}>
                           <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                             {student.name || 'Sin nombre asignado'}
                           </td>
                           <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{student.email}</td>
                           <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '-'}
                           </td>
                           <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                             <button onClick={() => handleDeleteStudent(student.uid)} className="text-red-600 hover:text-red-900 cursor-pointer">
                               Revocar Acceso
                             </button>
                           </td>
                         </tr>
                       ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Añadir Estudiante */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="fixed inset-0 bg-gray-600/75 transition-opacity" onClick={() => setShowModal(false)}></div>
          
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <form onSubmit={handleCreateStudent}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Añadir Nuevo Estudiante</h3>
                  
                  {formError && <div className="mb-4 bg-red-100 text-red-700 p-2 rounded text-sm">{formError}</div>}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                    <input 
                      type="text" required 
                      className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                    <input 
                      type="email" required 
                      className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Contraseña Temporal</label>
                    <input 
                      type="password" required minLength="6"
                      className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit" disabled={isSubmitting}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar y Crear'}
                  </button>
                  <button
                    type="button" onClick={() => setShowModal(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
        </div>
      )}
    </div>
  );
}
