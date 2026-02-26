import { useEffect, useState } from "react";
import apiClient from "../utils/axiosConfig";
import { Link } from "react-router-dom";
import "./Notes.css";

function NotesList() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, recent, favorites
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    subject: '',
    tags: ''
  });

  useEffect(() => {
    getNotes();
  }, []);

  const getNotes = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/notes");
      console.log(res);
      setNotes(res.data?.data || res.data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      setError('Error al cargar los apuntes');
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este apunte?')) {
      try {
        const res = await apiClient.delete("/notes/" + noteId);
        if (res.status === 204 || res.status === 200) {
          setNotes([...notes.filter((note) => note._id !== noteId)]);
        }
      } catch (error) {
        console.error("Error deleting note:", error);
        alert('Error al eliminar el apunte');
      }
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    try {
      const noteData = {
        ...newNote,
        tags: newNote.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      const res = await apiClient.post('/notes', noteData);
      const createdNote = res.data?.data || res.data;
      setNotes([createdNote, ...notes]);
      setNewNote({ title: '', content: '', subject: '', tags: '' });
      setShowCreateForm(false);
      alert('Apunte creado exitosamente');
    } catch (error) {
      console.error('Error creating note:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error al crear el apunte';
      alert(errorMessage);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewNote(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getFilteredNotes = () => {
    let filtered = notes;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.author?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoría
    if (filterBy === 'recent') {
      filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
    } else if (filterBy === 'favorites') {
      filtered = filtered.filter(note => note.isFavorite);
    }

    return filtered;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubjects = () => {
    const subjects = [...new Set(notes.map(note => note.subject).filter(Boolean))];
    return subjects.sort();
  };

  const filteredNotes = getFilteredNotes();

  if (loading) {
    return (
      <div className="notes-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando tus apuntes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-page">
      <header className="notes-page__header">
        <div>
          <h1 className="notes-page__title">📝 Mis Apuntes</h1>
          <p className="notes-page__subtitle">Organiza y gestiona tus apuntes de estudio</p>
        </div>
        <button
          type="button"
          className={`btn ${showCreateForm ? 'btn-secondary' : 'btn-primary'} notes-page__primary-btn`}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancelar' : '+ Nuevo Apunte'}
        </button>
      </header>

      {error && <div className="notes-page__alert">{error}</div>}

      {/* Formulario de creación */}
      {showCreateForm && (
        <section className="notes-page__form-section">
          <h3>✏️ Crear Nuevo Apunte</h3>
          <form onSubmit={handleCreateNote}>
            <div className="form-row">
              <div className="form-group">
                <label>📌 Título *</label>
                <input
                  type="text"
                  name="title"
                  value={newNote.title}
                  onChange={handleFormChange}
                  placeholder="Título del apunte"
                  required
                />
              </div>
              <div className="form-group">
                <label>📚 Materia</label>
                <input
                  type="text"
                  name="subject"
                  value={newNote.subject}
                  onChange={handleFormChange}
                  placeholder="Ej: Matemáticas, Física"
                />
              </div>
            </div>

            <div className="form-group">
              <label>📝 Contenido *</label>
              <textarea
                name="content"
                value={newNote.content}
                onChange={handleFormChange}
                placeholder="Escribe el contenido de tu apunte aquí..."
                rows="8"
                required
              />
            </div>

            <div className="form-group">
              <label>🏷️ Etiquetas</label>
              <input
                type="text"
                name="tags"
                value={newNote.tags}
                onChange={handleFormChange}
                placeholder="Etiquetas separadas por comas (ej: examen, importante, repaso)"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                💾 Guardar Apunte
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filtros y búsqueda */}
      <section className="notes-page__toolbar">
        <div className="notes-page__filters">
          <input
            type="text"
            placeholder="Buscar en tus apuntes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="notes-page__search"
          />
        </div>
        <div className="notes-page__filter-btns">
          <button
            type="button"
            className={`notes-page__filter-btn ${filterBy === 'all' ? 'notes-page__filter-btn--active' : ''}`}
            onClick={() => setFilterBy('all')}
          >
            Todas ({notes.length})
          </button>
          <button
            type="button"
            className={`notes-page__filter-btn ${filterBy === 'recent' ? 'notes-page__filter-btn--active' : ''}`}
            onClick={() => setFilterBy('recent')}
          >
            Recientes
          </button>
          <button
            type="button"
            className={`notes-page__filter-btn ${filterBy === 'favorites' ? 'notes-page__filter-btn--active' : ''}`}
            onClick={() => setFilterBy('favorites')}
          >
            Favoritas
          </button>
        </div>
        <div className="notes-page__stats">
          <div className="notes-page__stat">
            <span className="notes-page__stat-num">{notes.length}</span>
            <span className="notes-page__stat-label">Total de apuntes</span>
          </div>
          <div className="notes-page__stat">
            <span className="notes-page__stat-num">{getSubjects().length}</span>
            <span className="notes-page__stat-label">Materias</span>
          </div>
          <div className="notes-page__stat">
            <span className="notes-page__stat-num">{notes.filter(n => n.isFavorite).length}</span>
            <span className="notes-page__stat-label">Favoritas</span>
          </div>
          <div className="notes-page__stat">
            <span className="notes-page__stat-num">{filteredNotes.length}</span>
            <span className="notes-page__stat-label">Mostrando</span>
          </div>
        </div>
      </section>

      {filteredNotes.length === 0 ? (
        <section className="notes-page__empty">
          <div className="notes-page__empty-icon">📝</div>
          <h3>
            {notes.length === 0 
              ? 'No tienes apuntes aún' 
              : 'No se encontraron apuntes con los filtros aplicados'
            }
          </h3>
          <p>
            {notes.length === 0 
              ? 'Crea tu primer apunte para organizar tus apuntes de estudio'
              : 'Intenta con otros términos de búsqueda o filtros diferentes'
            }
          </p>
          {notes.length === 0 && (
            <div className="notes-page__empty-benefits">
              <h4>💡 Los apuntes te ayudan a:</h4>
              <ul>
                <li>📚 Organizar información importante</li>
                <li>🎯 Prepararte para exámenes</li>
                <li>💭 Recordar conceptos clave</li>
                <li>🔍 Encontrar información rápidamente</li>
              </ul>
            </div>
          )}
          {notes.length === 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              ✏️ Crear mi primer apunte
            </button>
          )}
        </section>
      ) : (
        <section className="notes-grid">
          {filteredNotes.map((note) => (
            <div className="note-card" key={note._id}>
              <div className="note-header">
                <h3 className="note-title">{note.title}</h3>
                <div className="note-actions">
                  <Link to={"/edit/" + note._id} className="btn btn-outline btn-small">
                    ✏️ Editar
                  </Link>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => deleteNote(note._id)}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>

              <div className="note-content">
                <p className="note-text">
                  {note.content.length > 150 
                    ? `${note.content.substring(0, 150)}...` 
                    : note.content
                  }
                </p>
              </div>

              <div className="note-meta">
                {note.subject && (
                  <span className="subject-badge">{note.subject}</span>
                )}
                {note.tags && note.tags.length > 0 && (
                  <div className="note-tags">
                    {note.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="tag-more">+{note.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="note-footer">
                <div className="note-info">
                  <span className="note-author">👤 {note.author || 'Tú'}</span>
                  <span className="note-date">📅 {formatDate(note.createdAt)}</span>
                </div>
                {note.updatedAt && note.updatedAt !== note.createdAt && (
                  <span className="note-updated">
                    ✏️ Editado: {formatDate(note.updatedAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default NotesList;
