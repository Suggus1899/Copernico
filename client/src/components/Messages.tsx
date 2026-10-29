import type { Conversation, Message } from '../types/communication';
import type { Appointment } from '../types/appointments';
import type { UserSummary } from '../types/auth';
import type { ApiResponse } from '../types/api';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import './Messages.css';
const Messages = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialUserId = searchParams.get('userId');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [conversationsError, setConversationsError] = useState('');
  const [messagesError, setMessagesError] = useState('');
  const [sendError, setSendError] = useState('');
  const [readFeedback, setReadFeedback] = useState('');

  useEffect(() => {
    loadConversations();
    markAllMessageNotificationsAsRead(false);
  }, []);

  const markAllMessageNotificationsAsRead = async (showFeedback = true) => {
    try {
      setMarkingAsRead(true);
      
      // Marcar todas las notificaciones de mensajes como leídas de una vez
      const response = await apiClient.patch<{ success: boolean; updated: number }>('/notifications/read-all?type=message_received');

      if (response.data?.updated > 0) {
        window.dispatchEvent(new CustomEvent('messagesRead'));
      }
      if (showFeedback) setReadFeedback(response.data?.updated ? 'Notificaciones de mensajes marcadas como leídas.' : 'No hay notificaciones de mensajes pendientes.');
    } catch (error) {
      console.error('Error marking message notifications as read:', error);
      if (showFeedback) setReadFeedback(getApiErrorMessage(error, 'No se pudieron actualizar las notificaciones.'));
    } finally {
      setMarkingAsRead(false);
    }
  };

  useEffect(() => {
    // Si viene un userId por la URL y aún no hay conversación activa, intentar abrirla
    if (initialUserId && !loadingConversations && !conversationsError && !activeConversation) {
      openConversationByUserId(initialUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId, conversations, loadingConversations, conversationsError]);

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
      setConversationsError('');
      const res = await apiClient.get<ApiResponse<Conversation[]>>('/messages/conversations');
      setConversations(res.data?.data || []);
      setFilteredConversations(res.data?.data || []);
    } catch (error) {
      console.error('Error loading conversations', error);
      setConversationsError(getApiErrorMessage(error, 'No se pudieron cargar las conversaciones.'));
    } finally {
      setLoadingConversations(false);
    }
  };

  const openConversationByUserId = async (otherUserId: string) => {
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
      const res = await apiClient.get<ApiResponse<Appointment[]>>('/appointments');
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
      } else {
        setConversationsError('No se encontró una conversación con este usuario.');
      }
    } catch (error) {
      console.error('Error loading user for conversation', error);
      setConversationsError(getApiErrorMessage(error, 'No se pudo abrir esta conversación.'));
    }
  };

  const loadMessages = async (otherUserId: string, conversationMeta: Conversation) => {
    try {
      setLoadingMessages(true);
      setMessagesError('');
      setMessages([]);
      setActiveConversation(conversationMeta);
      const res = await apiClient.get<ApiResponse<Message[]>>(`/messages/${otherUserId}`);
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
      setMessagesError(getApiErrorMessage(error, 'No se pudieron cargar los mensajes.'));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeConversation || !newMessage.trim()) return;
    try {
      setSending(true);
      setSendError('');
      const res = await apiClient.post<ApiResponse<Message>>('/messages', {
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
      setSendError(getApiErrorMessage(error, 'No se pudo enviar el mensaje.'));
    } finally {
      setSending(false);
    }
  };

  const returnToConversations = () => {
    setActiveConversation(null);
    setMessages([]);
    if (initialUserId) navigate(location.pathname, { replace: true });
  };

  const getUserName = (user: UserSummary | null) => {
    if (!user) return 'Usuario';
    const first = user.personalInfo?.firstName || '';
    const last = user.personalInfo?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || user.email || 'Usuario';
  };

  const getUserInitials = (user: UserSummary | null) => {
    if (!user) return '?';
    const first = user.personalInfo?.firstName?.[0] || '';
    const last = user.personalInfo?.lastName?.[0] || '';
    const initials = `${first}${last}`.trim();
    return initials || (user.email?.[0]?.toUpperCase() || '?');
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRoleLabel = (role: string | undefined) => {
    if (role === 'tutor') return 'Tutor';
    if (role === 'advisor') return 'Asesor';
    if (role === 'student') return 'Estudiante';
    return role;
  };

  return (
    <div className={`messages-page${activeConversation ? ' messages-page--conversation-open' : ''}`}>
      <header className="messages-header">
        <div className="messages-header-text">
          <h1>Mensajes</h1>
          <p>Conversa con tus tutores o estudiantes sobre tus clases y tutorías.</p>
        </div>
        <button
          type="button"
          className="messages-mark-read-btn"
          onClick={() => markAllMessageNotificationsAsRead()}
          disabled={markingAsRead}
          title="Marcar todas las notificaciones de mensajes como leídas"
        >
          {markingAsRead ? 'Actualizando…' : 'Marcar mensajes como leídos'}
        </button>
      </header>
      {readFeedback && <p className="messages-feedback" role="status">{readFeedback}</p>}
      {conversationsError && <div className="messages-error" role="alert">{conversationsError} <button type="button" onClick={loadConversations}>Reintentar</button></div>}

      <div className="messages-layout">
        <aside className="messages-sidebar" aria-label="Conversaciones">
          <div className="messages-sidebar-header">
            <input
              type="text"
              placeholder="Buscar conversación..."
              aria-label="Buscar conversación"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="messages-search"
            />
          </div>
          <div className="conversations-list">
            {loadingConversations ? (
              <div className="messages-chat-empty" role="status">
                Cargando conversaciones...
              </div>
            ) : conversationsError ? null : filteredConversations.length === 0 ? (
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
                  onClick={() => { if (conv.otherUser) loadMessages(conv.otherUser._id, conv); }}
                  aria-pressed={activeConversation?.otherUser?._id === conv.otherUser?._id}
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

        <section className="messages-chat" aria-label="Conversación">
          {!activeConversation ? (
            <div className="messages-chat-empty">
              <p>Selecciona una conversación para empezar a chatear.</p>
            </div>
          ) : (
            <>
              <div className="messages-chat-header">
                <button type="button" className="messages-back-btn" onClick={returnToConversations} aria-label="Volver a las conversaciones">
                  Volver
                </button>
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
              <div className="messages-chat-body" role="log" aria-label="Mensajes" aria-live="polite" aria-relevant="additions">
                {loadingMessages ? (
                  <div className="messages-chat-empty" role="status">
                    Cargando mensajes...
                  </div>
                ) : messagesError ? (
                  <div className="messages-chat-empty messages-error-inline" role="alert">
                    {messagesError} <button type="button" onClick={() => activeConversation?.otherUser && loadMessages(activeConversation.otherUser._id, activeConversation)}>Reintentar</button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="messages-chat-empty">
                    <p>No hay mensajes en esta conversación.</p>
                    <p>Escribe el primero para iniciar el chat.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
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
              {sendError && <p className="messages-send-error" role="alert">{sendError}</p>}
              <form className="messages-chat-footer" onSubmit={handleSend}>
                <label className="visually-hidden" htmlFor="message-composer">Escribe tu mensaje</label>
                <input
                  id="message-composer"
                  type="text"
                  className="messages-input"
                  placeholder="Escribe tu mensaje..."
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); setSendError(''); }}
                  disabled={sending}
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

