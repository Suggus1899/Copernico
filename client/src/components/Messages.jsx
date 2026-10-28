import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import './Messages.css';

const Messages = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialUserId = searchParams.get('userId');
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);

  useEffect(() => {
    loadConversations();
    markAllMessageNotificationsAsRead();
  }, []);

  const markAllMessageNotificationsAsRead = async () => {
    try {
      setMarkingAsRead(true);
      
      // Marcar todas las notificaciones de mensajes como leídas de una vez
      const response = await apiClient.patch('/notifications/read-all?type=message_received');

      if (response.data?.updated > 0) {
        console.log(`✅ ${response.data.updated} notificaciones de mensajes marcadas como leídas`);
        
        // Disparar evento personalizado para actualizar el badge
        window.dispatchEvent(new CustomEvent('messagesRead'));
      } else {
        console.log('ℹ️ No había notificaciones de mensajes para marcar como leídas');
      }
    } catch (error) {
      console.error('Error marking message notifications as read:', error);
    } finally {
      setMarkingAsRead(false);
    }
  };

  useEffect(() => {
    // Si viene un userId por la URL y aún no hay conversación activa, intentar abrirla
    if (initialUserId && conversations.length > 0 && !activeConversation) {
      openConversationByUserId(initialUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId, conversations]);

  useEffect(() => {
    if (!search) {
      setFilteredConversations(conversations);
      return;
    }
    const term = search.toLowerCase();
    setFilteredConversations(
      conversations.filter(c => {
        const name = getUserName(c.otherUser).toLowerCase();
        return name.includes(term);
      })
    );
  }, [search, conversations]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await apiClient.get('/messages/conversations');
      setConversations(res.data?.data || []);
      setFilteredConversations(res.data?.data || []);
    } catch (error) {
      console.error('Error loading conversations', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const openConversationByUserId = async (otherUserId) => {
    // Intentar usar una conversación existente
    const existing = conversations.find(
      (c) => c.otherUser?._id === otherUserId
    );
    if (existing) {
      await loadMessages(otherUserId, existing);
      return;
    }

    // Sin conversación previa: abrir un chat vacío con quien comparte una cita contigo.
    try {
      const res = await apiClient.get('/appointments');
      const appointments = res.data?.data || [];
      const match = appointments.find(
        (a) => a.tutorId?._id === otherUserId || a.studentId?._id === otherUserId
      );
      const user = match?.tutorId?._id === otherUserId ? match.tutorId : match?.studentId;
      if (user && user._id) {
        const meta = {
          otherUser: user,
          lastMessageAt: null,
          lastMessage: '',
          lastSender: null,
          unreadCount: 0
        };
        await loadMessages(user._id, meta);
      }
    } catch (error) {
      console.error('Error loading user for conversation', error);
    }
  };

  const loadMessages = async (otherUserId, conversationMeta) => {
    try {
      setLoadingMessages(true);
      setActiveConversation(conversationMeta);
      const res = await apiClient.get(`/messages/${otherUserId}`);
      setMessages(res.data?.data || []);

      // marcar como leídos en backend
      try {
        await apiClient.patch(`/messages/${otherUserId}/read`);
        await loadConversations();
      } catch (err) {
        console.error('Error marking messages as read', err);
      }
    } catch (error) {
      console.error('Error loading messages', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeConversation || !newMessage.trim()) return;
    try {
      setSending(true);
      const res = await apiClient.post('/messages', {
        to: activeConversation.otherUser?._id,
        text: newMessage.trim()
      });
      const sent = res.data?.data;
      if (sent) {
        setMessages(prev => [...prev, sent]);
        setNewMessage('');
        await loadConversations();
      }
    } catch (error) {
      console.error('Error sending message', error);
      alert('No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const getUserName = (user) => {
    if (!user) return 'Usuario';
    const first = user.personalInfo?.firstName || '';
    const last = user.personalInfo?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || user.email || 'Usuario';
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const first = user.personalInfo?.firstName?.[0] || '';
    const last = user.personalInfo?.lastName?.[0] || '';
    const initials = `${first}${last}`.trim();
    return initials || (user.email?.[0]?.toUpperCase() || '?');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRoleLabel = (role) => {
    if (role === 'tutor') return 'Tutor';
    if (role === 'advisor') return 'Asesor';
    if (role === 'student') return 'Estudiante';
    return role;
  };

  return (
    <div className="messages-page">
      <header className="messages-header">
        <div className="messages-header-text">
          <h1>💬 Mensajes</h1>
          <p>Conversa con tus tutores o estudiantes sobre tus clases y tutorías.</p>
        </div>
        <button
          type="button"
          className="messages-mark-read-btn"
          onClick={() => {
            console.log('Botón clickeado!');
            markAllMessageNotificationsAsRead();
          }}
          disabled={markingAsRead}
          title="Marcar todas las notificaciones de mensajes como leídas"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          {markingAsRead ? '⏳ Marcando...' : '✓ Marcar como leídas'}
        </button>
      </header>

      <div className="messages-layout">
        <aside className="messages-sidebar">
          <div className="messages-sidebar-header">
            <input
              type="text"
              placeholder="Buscar conversación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="messages-search"
            />
          </div>
          <div className="conversations-list">
            {loadingConversations ? (
              <div className="messages-chat-empty">
                Cargando conversaciones...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="messages-chat-empty">
                Aún no tienes conversaciones.
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.otherUser?._id}
                  type="button"
                  className={
                    'conversation-item ' +
                    (activeConversation?.otherUser?._id === conv.otherUser?._id
                      ? 'conversation-item--active'
                      : '')
                  }
                  onClick={() => loadMessages(conv.otherUser._id, conv)}
                >
                  <div className="conversation-avatar">
                    {getUserInitials(conv.otherUser)}
                  </div>
                  <div className="conversation-main">
                    <p className="conversation-name">{getUserName(conv.otherUser)}</p>
                    <p className="conversation-last">
                      {conv.lastMessage || 'Sin mensajes todavía'}
                    </p>
                  </div>
                  <div className="conversation-meta">
                    {conv.lastMessageAt && (
                      <span>{formatTime(conv.lastMessageAt)}</span>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="conversation-unread">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="messages-chat">
          {!activeConversation ? (
            <div className="messages-chat-empty">
              <p>Selecciona una conversación para empezar a chatear.</p>
            </div>
          ) : (
            <>
              <div className="messages-chat-header">
                <div className="conversation-avatar">
                  {getUserInitials(activeConversation.otherUser)}
                </div>
                <div className="chat-header-info">
                  <span className="chat-header-name">
                    {getUserName(activeConversation.otherUser)}
                  </span>
                  <span className="chat-header-role">
                    {formatRoleLabel(activeConversation.otherUser?.role)}
                  </span>
                </div>
              </div>
              <div className="messages-chat-body">
                {loadingMessages ? (
                  <div className="messages-chat-empty">
                    Cargando mensajes...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="messages-chat-empty">
                    <p>No hay mensajes en esta conversación.</p>
                    <p>Escribe el primero para iniciar el chat.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender?._id === activeConversation.meId;
                    // Como no estamos guardando meId, asumimos que sender distinto a otherUser es "yo"
                    const isMine = msg.sender?._id !== activeConversation.otherUser?._id;
                    return (
                      <div
                        key={msg._id}
                        className={
                          'message-bubble ' + (isMine ? 'me' : 'them')
                        }
                      >
                        <span>{msg.text}</span>
                        <span className="message-meta">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <form className="messages-chat-footer" onSubmit={handleSend}>
                <input
                  type="text"
                  className="messages-input"
                  placeholder="Escribe tu mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="messages-send-btn"
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? 'Enviando...' : <>Enviar</>}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Messages;

