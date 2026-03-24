import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  addDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { MessageSquare, Trash2, Users, Search, AlertCircle, ChevronRight, Send, User } from 'lucide-react';

export default function ChatMonitor() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('groups'); // 'groups' or 'private'
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeConversations, setActiveConversations] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedConvo, setSelectedConvo] = useState(null); // { userA, userB }
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef();

  // Load groups and all users for resolution
  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // Fetch all relevant users once to resolve names
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(list);
      setLoading(false);
    });
    
    return () => { unsubGroups(); unsubUsers(); };
  }, []);

  // Scan private_messages for active conversations
  useEffect(() => {
    if (activeTab !== 'private') return;
    
    // We get last 300 messages to detect unique conversation pairs
    const q = query(collection(db, 'private_messages'), orderBy('timestamp', 'desc'), limit(300));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convMap = new Map();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.participants && data.participants.length === 2) {
          const key = [...data.participants].sort().join('_');
          if (!convMap.has(key)) {
            convMap.set(key, {
              participants: data.participants,
              lastText: data.text,
              timestamp: data.timestamp
            });
          }
        }
      });
      setActiveConversations(Array.from(convMap.values()));
    });

    return () => unsubscribe();
  }, [activeTab]);

  // Load messages for selection
  useEffect(() => {
    let q;
    if (activeTab === 'groups' && selectedGroup) {
      q = query(collection(db, 'group_chats'), where('groupId', '==', selectedGroup.id));
    } else if (activeTab === 'private' && selectedConvo) {
      const participants = [selectedConvo.userA.id, selectedConvo.userB.id].sort();
      q = query(collection(db, 'private_messages'), where('participants', '==', participants));
    } else {
      setMessages([]);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      msgs.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tA - tB;
      });
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedGroup, selectedConvo, activeTab]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const text = newMessage;
    setNewMessage('');

    try {
      if (activeTab === 'groups' && selectedGroup) {
        await addDoc(collection(db, 'group_chats'), {
          text,
          senderId: user.uid,
          senderName: "Administrador",
          groupId: selectedGroup.id,
          timestamp: serverTimestamp()
        });
      } else if (activeTab === 'private' && selectedConvo) {
        const participants = [selectedConvo.userA.id, selectedConvo.userB.id].sort();
        await addDoc(collection(db, 'private_messages'), {
          text,
          senderId: user.uid,
          senderName: "Administrador",
          participants,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error sending message as admin:', error);
    }
  };

  const handleClearChat = async () => {
    const label = activeTab === 'groups' ? `grupo "${selectedGroup.name}"` : `conversación privada`;
    if (!window.confirm(`¿Estás seguro de que deseas VACÍAR el chat de ${label}? Esta acción no se puede deshacer.`)) return;

    setClearing(true);
    try {
      const coll = activeTab === 'groups' ? 'group_chats' : 'private_messages';
      let q;
      if (activeTab === 'groups') {
        q = query(collection(db, coll), where('groupId', '==', selectedGroup.id));
      } else {
        const participants = [selectedConvo.userA.id, selectedConvo.userB.id].sort();
        q = query(collection(db, coll), where('participants', '==', participants));
      }

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      alert('Historial de chat vaciado correctamente.');
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Error al vaciar el chat.');
    } finally {
      setClearing(false);
    }
  };

  const getUserName = (u) => {
    if (!u) return 'Usuario Desconocido';
    if (u.role === 'admin') return 'Administrador';
    if (u.nombres && u.apellidos) return `${u.nombres} ${u.apellidos}`;
    if (u.displayName) return u.displayName;
    return u.email?.split('@')[0] || 'Usuario';
  };

  const getInitials = (u) => {
    if (!u) return '?';
    const name = getUserName(u);
    return name[0].toUpperCase();
  };

  const resolveConvo = (conv) => {
    const u1 = users.find(u => u.id === conv.participants[0]);
    const u2 = users.find(u => u.id === conv.participants[1]);
    
    // Si no encontramos uno de los usuarios, podría ser porque es el admin actual
    // o porque se borró de la colección users pero sigue en Auth
    const finalU1 = u1 || (conv.participants[0] === user?.uid ? { id: user.uid, displayName: 'Administrador', role: 'admin' } : null);
    const finalU2 = u2 || (conv.participants[1] === user?.uid ? { id: user.uid, displayName: 'Administrador', role: 'admin' } : null);

    if (!finalU1 || !finalU2) return null;

    return { 
      userA: finalU1, 
      userB: finalU2, 
      lastText: conv.lastText, 
      timestamp: conv.timestamp 
    };
  };

  const filteredGroups = groups.filter(g => g.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredConvos = activeConversations
    .map(c => resolveConvo(c))
    .filter(c => c !== null)
    .filter(c => {
      const nameA = getUserName(c.userA).toLowerCase();
      const nameB = getUserName(c.userB).toLowerCase();
      return nameA.includes(searchTerm.toLowerCase()) || nameB.includes(searchTerm.toLowerCase());
    });

  const card = `rounded-3xl border transition-all duration-300 ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-80px)] flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monitor de Chats</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Auditoría y control de conversaciones reales.</p>
        </div>
        <div className="flex p-1 rounded-2xl bg-gray-500/10 shrink-0">
          <button 
            onClick={() => { setActiveTab('groups'); setSelectedGroup(null); setSelectedConvo(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'groups' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-400'}`}
          >Grupos</button>
          <button 
            onClick={() => { setActiveTab('private'); setSelectedGroup(null); setSelectedConvo(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'private' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-400'}`}
          >Privados Activios</button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Sidebar Selection */}
        <div className="lg:col-span-4 flex flex-col space-y-4 min-h-0">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder={activeTab === 'groups' ? "Buscar grupo..." : "Buscar chat activo..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none border ${
                isDarkMode ? 'bg-[#151c2c] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
              }`}
            />
          </div>

          <div className={`${card} flex-1 overflow-y-auto p-2 min-h-0 scrollbar-thin`}>
            {loading ? (
              <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : activeTab === 'groups' ? (
              filteredGroups.length === 0 ? (
                <div className="text-center p-8 text-gray-500 text-xs italic">No se encontraron grupos.</div>
              ) : (
                filteredGroups.map(group => (
                  <button key={group.id} onClick={() => setSelectedGroup(group)} className={`w-full flex items-center justify-between p-4 rounded-2xl mb-1 transition-all ${selectedGroup?.id === group.id ? (isDarkMode ? 'bg-[#007aff] text-white' : 'bg-indigo-600 text-white shadow-md') : (isDarkMode ? 'text-gray-400 hover:bg-gray-800/50 hover:text-white' : 'text-gray-600 hover:bg-gray-50 shadow-sm')}`}>
                    <div className="flex items-center gap-3"><Users size={18} /><span className="font-bold text-sm truncate">{group.name}</span></div>
                    <ChevronRight size={16} className={selectedGroup?.id === group.id ? 'opacity-100' : 'opacity-20'} />
                  </button>
                ))
              )
            ) : (
              <div className="space-y-2">
                {filteredConvos.length === 0 ? (
                  <div className="text-center p-8 text-gray-500 text-xs italic">No hay conversaciones privadas con historial.</div>
                ) : (
                  filteredConvos.map((c, i) => {
                    const isActive = (selectedConvo?.userA.id === c.userA.id && selectedConvo?.userB.id === c.userB.id);
                    const nameA = getUserName(c.userA);
                    const nameB = getUserName(c.userB);
                    
                    return (
                      <button 
                        key={i} 
                        onClick={() => setSelectedConvo(c)}
                        className={`w-full p-4 rounded-2xl text-left transition-all mb-2 flex items-center gap-4 ${isActive ? (isDarkMode ? 'bg-[#007aff] text-white shadow-lg' : 'bg-indigo-600 text-white shadow-md') : (isDarkMode ? 'bg-gray-800/20 text-gray-400 hover:bg-gray-800/40 border border-transparent' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100')}`}
                      >
                        <div className="flex -space-x-3 shrink-0">
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-gray-800 border-gray-900 text-cyan-400' : 'bg-white border-gray-50 text-indigo-600'}`}>
                            {getInitials(c.userA)}
                          </div>
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-[#151c2c] border-gray-900 text-amber-400' : 'bg-gray-100 border-white text-indigo-600'}`}>
                            {getInitials(c.userB)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs truncate mb-0.5">{nameA} y {nameB}</div>
                          <p className={`text-[10px] line-clamp-1 opacity-70 italic`}>
                            {c.lastText}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Detail Area */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          {(selectedGroup || selectedConvo) ? (
            <div className={`${card} flex flex-col h-full overflow-hidden min-h-0 shadow-xl`}>
              {/* Detail Header */}
              <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-gray-800 bg-[#0b1120]/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-gray-800 text-cyan-400' : 'bg-indigo-600 text-white'}`}>
                    {activeTab === 'groups' ? <Users size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <h2 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {activeTab === 'groups' ? selectedGroup.name : `${getUserName(selectedConvo.userA)} y ${getUserName(selectedConvo.userB)}`}
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                      {activeTab === 'groups' ? 'Panel de Auditoría Grupal' : 'Auditoría de Mensajería Privada'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearChat}
                  disabled={clearing || messages.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    clearing || messages.length === 0 ? 'bg-gray-500/5 text-gray-500 cursor-not-allowed' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                  }`}
                >
                  <Trash2 size={14} /> {clearing ? 'Vaciando...' : 'Vaciar Chat'}
                </button>
              </div>

              {/* Messages viewport */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-transparent scroll-smooth">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-20 italic text-sm"><MessageSquare size={64} className="mb-4" /><p>No hay mensajes registrados.</p></div>
                ) : (
                  messages.map(msg => {
                    const isAdmin = msg.senderId === user.uid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${isAdmin ? 'text-indigo-500' : (isDarkMode ? 'text-cyan-400' : 'text-indigo-600')}`}>
                            {msg.senderName}
                          </span>
                          <span className="text-[9px] text-gray-500">
                            {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                          </span>
                        </div>
                        <div className={`text-sm p-3 rounded-2xl inline-block max-w-[90%] break-words shadow-sm ${
                          isAdmin 
                            ? (isDarkMode ? 'bg-[#007aff] text-white rounded-tr-none' : 'bg-indigo-600 text-white rounded-tr-none')
                            : (isDarkMode ? 'bg-[#0b1120] text-gray-300 border border-gray-800 rounded-tl-none' : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-none')
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Participation Input (Admin can talk too) */}
              <form 
                onSubmit={handleSend}
                className={`p-4 border-t shrink-0 ${isDarkMode ? 'border-gray-800 bg-[#0b1120]/50' : 'border-gray-100 bg-gray-50/50'}`}
              >
                <div className="relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Participar en la conversación como Administrador..."
                    className={`w-full pl-4 pr-12 py-3.5 rounded-2xl text-sm focus:outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-[#0f172a] border-gray-800 text-white focus:border-cyan-500/50' 
                        : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500 shadow-inner'
                    } border`}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className={`absolute right-1.5 top-1.5 p-2.5 rounded-xl transition-all ${
                      newMessage.trim() 
                        ? (isDarkMode ? 'bg-[#007aff] text-white hover:bg-[#0062cc]' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md')
                        : 'text-gray-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className={`${card} flex-1 flex flex-col items-center justify-center text-gray-500 text-center p-8 opacity-40 shadow-inner`}>
              <div className="w-24 h-24 rounded-full bg-gray-500/5 flex items-center justify-center mb-6"><MessageSquare size={48} /></div>
              <h3 className="text-xl font-bold mb-2">Monitor Administrativo 2.0</h3>
              <p className="max-w-xs text-sm">Selecciona una conversación a la izquierda para supervisar y participar en tiempo real.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
