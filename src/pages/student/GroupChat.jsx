import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Send, Users, MessageSquare } from 'lucide-react';

export default function GroupChat({ group, profile }) {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef();

  useEffect(() => {
    if (!group?.id) return;

    const q = query(
      collection(db, 'group_chats'),
      where('groupId', '==', group.id)
      // Removal of orderBy to avoid mandatory composite index requirement
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort in memory to ensure correct order without index
      msgs.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tA - tB;
      });

      setMessages(msgs);
      setLoading(false);
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [group?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !group?.id) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'group_chats'), {
        text,
        senderId: user.uid,
        senderName: profile?.nombres ? `${profile.nombres} ${profile.apellidos}` : profile?.displayName || user.email,
        groupId: group.id,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar mensaje.');
    }
  };

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-gray-500">
        <Users size={48} className="mb-4 opacity-20" />
        <p>Debes estar asignado a un grupo para usar el chat.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-100px)] flex flex-col">
      <div className={`mb-4 flex items-center justify-between shrink-0`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Chat de Grupo</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{group.name}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${isDarkMode ? 'bg-[#007aff]/10 text-cyan-400' : 'bg-indigo-100 text-indigo-700'}`}>
          Solo Texto
        </div>
      </div>

      <div className={`flex-1 rounded-3xl border flex flex-col overflow-hidden min-h-0 ${isDarkMode ? 'bg-[#151c2c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
        {/* Messages area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
               Cargando mensajes...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
               <MessageSquare size={48} className="mb-2" />
               <p>¡Inicia la conversación!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user.uid;
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && (
                    <span className="text-[10px] font-bold text-gray-500 ml-1 mb-1 uppercase tracking-wider">
                      {msg.senderName}
                    </span>
                  )}
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
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

        {/* Input area */}
        <form 
          onSubmit={handleSend}
          className={`p-4 border-t shrink-0 ${isDarkMode ? 'border-gray-800 bg-[#0b1120]/50' : 'border-gray-100 bg-gray-50/50'} backdrop-blur-sm`}
        >
          <div className="relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
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
    </div>
  );
}
