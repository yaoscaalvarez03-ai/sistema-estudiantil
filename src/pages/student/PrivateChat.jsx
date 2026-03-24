import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Send, User, Search, MessageSquare, ChevronLeft } from 'lucide-react';

export default function PrivateChat({ profile, group }) {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastActivity, setLastActivity] = useState({});
  const scrollRef = useRef();

  // Load available users (group members + teacher + admins + colleagues)
  useEffect(() => {
    const loadUsers = async () => {
      if (!group) {
        setLoadingUsers(false);
        return;
      }

      try {
        const membersList = [];
        
        // 1. Fetch Students in the group (or assigned to teacher)
        if (group.studentIds && group.studentIds.length > 0) {
          const studentPromises = group.studentIds.map(id => getDoc(doc(db, 'users', id)));
          const studentSnaps = await Promise.all(studentPromises);
          studentSnaps.forEach(snap => {
            if (snap.exists()) membersList.push({ id: snap.id, ...snap.data() });
          });
        }

        // 2. Fetch Teacher (if student viewing a group)
        if (group.teacherId && !group.isTeacherView) {
          const tSnap = await getDoc(doc(db, 'users', group.teacherId));
          if (tSnap.exists()) membersList.push({ id: tSnap.id, ...tSnap.data() });
        }

        // 3. Fetch Administrators (All roles/rol variants)
        const adminsQ1 = query(collection(db, 'users'), where('role', '==', 'admin'));
        const adminsQ2 = query(collection(db, 'users'), where('rol', '==', 'admin'));
        const [snap1, snap2] = await Promise.all([getDocs(adminsQ1), getDocs(adminsQ2)]);
        
        [...snap1.docs, ...snap2.docs].forEach(snap => {
          if (snap.exists() && !membersList.find(m => m.id === snap.id)) {
            membersList.push({ id: snap.id, ...snap.data() });
          }
        });

        // 4. Fetch Fellow Teachers (if in Teacher View)
        if (group.isTeacherView) {
          const teachersQ = query(collection(db, 'users'), where('role', '==', 'teacher'));
          const tSnap = await getDocs(teachersQ);
          tSnap.docs.forEach(snap => {
            if (snap.exists() && !membersList.find(m => m.id === snap.id)) {
              membersList.push({ id: snap.id, ...snap.data() });
            }
          });
        }

        const filteredList = membersList.filter(u => u.id !== user.uid);
        setUsers(filteredList);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, [group, user.uid]);

  // Load Unread Counts (Global for user)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'private_messages'),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );
    return onSnapshot(q, (snap) => {
      const counts = {};
      snap.docs.forEach(d => {
        const senderId = d.data().senderId;
        counts[senderId] = (counts[senderId] || 0) + 1;
      });
      setUnreadCounts(counts);
    });
  }, [user.uid]);

  // Load Activity Times for Sorting
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'private_messages'),
      where('participants', 'array-contains', user.uid)
    );
    return onSnapshot(q, (snap) => {
      const times = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const otherId = data.participants.find(p => p !== user.uid);
        if (otherId) {
          const t = data.timestamp?.toMillis ? data.timestamp.toMillis() : 0;
          if (!times[otherId] || t > times[otherId]) times[otherId] = t;
        }
      });
      setLastActivity(times);
    });
  }, [user.uid]);

  // Mark as read when selecting user
  useEffect(() => {
    if (!selectedUser || !user) return;
    const participants = [user.uid, selectedUser.id].sort();
    const q = query(
      collection(db, 'private_messages'),
      where('participants', '==', participants),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );
    getDocs(q).then(snap => {
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { read: true }));
      batch.commit();
    });
  }, [selectedUser, user.uid]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    setLoadingChat(true);
    // Identification for the conversation: array containing both UIDs
    const participants = [user.uid, selectedUser.id].sort();

    const q = query(
      collection(db, 'private_messages'),
      where('participants', '==', participants)
      // Removal of orderBy to avoid mandatory composite index
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in memory
      msgs.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tA - tB;
      });

      setMessages(msgs);
      setLoadingChat(false);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoadingChat(false);
    });

    return () => unsubscribe();
  }, [selectedUser, user.uid]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const text = newMessage;
    setNewMessage('');

    try {
      const participants = [user.uid, selectedUser.id].sort();
      await addDoc(collection(db, 'private_messages'), {
        text,
        senderId: user.uid,
        receiverId: selectedUser.id,
        participants,
        senderName: profile?.nombres ? `${profile.nombres} ${profile.apellidos}` : profile?.displayName || user.email,
        timestamp: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar mensaje.');
    }
  };

  const filteredUsers = users.filter(u => {
    const name = `${u.nombres || ''} ${u.apellidos || ''} ${u.displayName || ''} ${u.email || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    const tA = lastActivity[a.id] || 0;
    const tB = lastActivity[b.id] || 0;
    return tB - tA; // Most recent first
  });

  const card = `rounded-3xl border transition-all duration-300 ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-100px)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mensajes Privados</h1>
        {selectedUser && (
           <button 
             onClick={() => setSelectedUser(null)}
             className={`lg:hidden flex items-center gap-1 text-xs font-bold ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}
           >
             <ChevronLeft size={14} /> Volver a la lista
           </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-0">
        {/* Users List */}
        <div className={`lg:col-span-4 flex flex-col min-h-0 space-y-3 ${selectedUser ? 'hidden lg:flex' : 'flex'}`}>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Buscar compañero..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none border ${
                isDarkMode ? 'bg-[#151c2c] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
              }`}
            />
          </div>

          <div className={`${card} flex-1 overflow-y-auto p-2 scrollbar-thin`}>
            {loadingUsers ? (
              <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center p-8 text-gray-500 text-xs italic">No se encontraron integrantes.</div>
            ) : (
              filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl mb-1 transition-all ${
                    selectedUser?.id === u.id
                      ? (isDarkMode ? 'bg-[#007aff] text-white' : 'bg-indigo-600 text-white shadow-md')
                      : (isDarkMode ? 'text-gray-400 hover:bg-gray-800/50 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600')
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedUser?.id === u.id ? 'bg-white/20' : (isDarkMode ? 'bg-gray-800' : 'bg-gray-100')}`}>
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm truncate">{u.nombres ? `${u.nombres} ${u.apellidos}` : u.displayName || u.email}</div>
                      {unreadCounts[u.id] > 0 && selectedUser?.id !== u.id && (
                        <div className={`shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-black px-1 animate-pulse ${
                          isDarkMode ? 'bg-cyan-500 text-black' : 'bg-red-500 text-white'
                        }`}>
                          {unreadCounts[u.id]}
                        </div>
                      )}
                    </div>
                    <div className={`text-[10px] truncate ${selectedUser?.id === u.id ? 'text-white/70' : 'text-gray-500'}`}>
                      {(u.role || u.rol) === 'admin' ? '🛡️ Administrador' : ((u.role || u.rol) === 'teacher' || (u.role || u.rol) === 'docente' ? '👨‍🏫 Docente' : '👤 Alumno')}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`lg:col-span-8 flex flex-col min-h-0 ${!selectedUser ? 'hidden lg:flex' : 'flex'}`}>
          {selectedUser ? (
            <div className={`${card} flex flex-col h-full overflow-hidden`}>
              {/* Header */}
              <div className={`p-4 border-b flex items-center gap-3 ${isDarkMode ? 'border-gray-800 bg-[#0b1120]/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-gray-800 text-cyan-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  <User size={20} />
                </div>
                <div>
                  <h2 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedUser.nombres ? `${selectedUser.nombres} ${selectedUser.apellidos}` : selectedUser.displayName || selectedUser.email}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">En línea</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
              >
                {loadingChat ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                    Cargando chat...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-30 italic text-sm">
                    <MessageSquare size={48} className="mb-2" />
                    <p>Escribe algo para iniciar el chat privado.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === user.uid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                          isMine 
                            ? (isDarkMode ? 'bg-[#007aff] text-white rounded-tr-none' : 'bg-indigo-600 text-white rounded-tr-none')
                            : (isDarkMode ? 'bg-[#0b1120] text-gray-200 border border-gray-800 rounded-tl-none' : 'bg-gray-100 text-gray-800 rounded-tl-none')
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-gray-500 mt-1 mx-1">
                          {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <form 
                onSubmit={handleSend}
                className={`p-4 border-t ${isDarkMode ? 'border-gray-800 bg-[#0b1120]/50' : 'border-gray-100 bg-gray-50/50'}`}
              >
                <div className="relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Mensaje privado..."
                    className={`w-full pl-4 pr-12 py-3 rounded-2xl text-sm focus:outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-[#0f172a] border-gray-800 text-white focus:border-cyan-500/50' 
                        : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                    } border shadow-inner`}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className={`absolute right-1.5 top-1.5 p-2 rounded-xl transition-all ${
                      newMessage.trim() 
                        ? (isDarkMode ? 'bg-[#007aff] text-white hover:bg-[#0062cc]' : 'bg-indigo-600 text-white hover:bg-indigo-700')
                        : 'text-gray-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className={`${card} flex flex-col items-center justify-center h-full text-gray-500 text-center p-8 opacity-50`}>
              <div className="w-20 h-20 rounded-full bg-gray-500/5 flex items-center justify-center mb-6">
                <MessageSquare size={40} />
              </div>
              <h3 className="text-xl font-bold mb-2">Mensajería Privada</h3>
              <p className="max-w-xs text-sm">Selecciona a un compañero de la lista lateral para chatear de forma privada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
