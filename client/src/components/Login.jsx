import React, { Component } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from "react-router-dom";

// Wrapper component to use hooks with class component
function LoginWrapper() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Ensure searchParams is always available
  if (!searchParams) {
    console.warn('searchParams is not available');
  }
  
  return <Login navigate={navigate} searchParams={searchParams || new URLSearchParams()} />;
}

class Login extends Component {
  state = {
    email: '',
    password: '',
    error: '',
    loading: false,
  };

  componentDidMount() {
    // Pre-fill email if it comes from registration
    try {
      const emailFromQuery = this.props.searchParams?.get('email');
      if (emailFromQuery) {
        this.setState({ email: decodeURIComponent(emailFromQuery) });
      }
    } catch (error) {
      console.error('Error reading search params:', error);
    }
  }

  onChangeEmail = (e) => {
    this.setState({
      email: e.target.value,
      error: '', // Clear error when user types
    });
  };

  onChangePassword = (e) => {
    this.setState({
      password: e.target.value,
      error: '', // Clear error when user types
    });
  };

  onSubmit = async (e) => {
    e.preventDefault();
    this.setState({ loading: true, error: '' });
    
    const user = {
      email: this.state.email,
      password: this.state.password,
    };
    
    try {
      const res = await axios.post('http://localhost:4000/api/auth/signin', user);
      localStorage.setItem('token', res.data); // Save the token
      this.props.navigate('/dashboard'); // Redirect to dashboard using React Router
    } catch (error) {
      console.error('Error logging in:', error);
      console.error('Error response:', error.response);
      
      // Show user-friendly error message
      let errorMessage = 'Error al iniciar sesión. Por favor, verifica tus credenciales.';
      
      if (error.response?.data) {
        // Handle different error response formats
        const errorData = error.response.data;
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          // If error is an object with a message property
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.status) {
            errorMessage = `Error ${errorData.error.status}: ${errorData.error.message || 'Error desconocido'}`;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.response?.status === 400) {
        errorMessage = 'Correo o contraseña incorrectos.';
      } else if (!error.response) {
        errorMessage = 'Error de conexión. Verifica que el servidor esté corriendo.';
      }
      
      this.setState({ 
        error: errorMessage,
        loading: false 
      });
    }
  };

  render() {
    try {
      const emailFromQuery = this.props.searchParams?.get('email');
      const showSuccessMessage = emailFromQuery && !this.state.error;
      
      return (
      <div className="login-container">
        <div className="login-box">
          <Link to="/" className="back-home-btn">
            ← Volver al inicio
          </Link>
          <h2>Iniciar Sesión</h2>
          <p>Bienvenido de nuevo, ¡inicia sesión en tu cuenta!</p>
          {showSuccessMessage && (
            <div className="alert alert-success" role="alert">
              ¡Cuenta creada exitosamente! Por favor, inicia sesión con tus credenciales.
            </div>
          )}
          {this.state.error && (
            <div className="alert alert-danger" role="alert">
              {this.state.error}
            </div>
          )}
          <form onSubmit={this.onSubmit}>
            <div className="input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                type="email"
                id="email"
                placeholder="Ingresa tu correo electrónico"
                onChange={this.onChangeEmail}
                value={this.state.email}
                required
                disabled={this.state.loading}
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                placeholder="Ingresa tu contraseña"
                onChange={this.onChangePassword}
                value={this.state.password}
                required
                disabled={this.state.loading}
              />
            </div>
            <div className="options">
              <a href="#">¿Olvidaste tu contraseña?</a>
            </div>
            <button 
              type="submit" 
              className="sign-in-btn"
              disabled={this.state.loading}
            >
              {this.state.loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
          <p className="signup-link">
            ¿No tienes una cuenta? <Link to="/signup">Regístrate ahora</Link>
          </p>
        </div>
      </div>
    );
    } catch (error) {
      console.error('Error rendering Login:', error);
      return (
        <div className="login-container">
          <div className="login-box">
            <h2>Error</h2>
            <p>Hubo un error al cargar la página. Por favor, recarga.</p>
          </div>
        </div>
      );
    }
  }
}

export default LoginWrapper;
