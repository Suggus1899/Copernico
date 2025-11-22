import React, { Component } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Wrapper component to use hooks with class component
function CreateUserWrapper() {
  const navigate = useNavigate();
  return <CreateUser navigate={navigate} />;
}

class CreateUser extends Component {
  state = {
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'Estudiante',
    error: '',
    passwordMatchError: '',
    loading: false,
  };

  onChangeFullname = (e) => {
    this.setState({
      fullname: e.target.value,
      error: '', // Clear error when user types
    });
  };

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
      passwordMatchError: '', // Clear password match error
    }, () => {
      // Check if passwords match when password changes
      if (this.state.confirmPassword && this.state.password !== this.state.confirmPassword) {
        this.setState({ passwordMatchError: 'Las contraseñas no coinciden' });
      } else if (this.state.confirmPassword && this.state.password === this.state.confirmPassword) {
        this.setState({ passwordMatchError: '' });
      }
    });
  };

  onChangeConfirmPassword = (e) => {
    this.setState({
      confirmPassword: e.target.value,
      error: '', // Clear error when user types
    }, () => {
      // Check if passwords match
      if (this.state.password && this.state.confirmPassword) {
        if (this.state.password !== this.state.confirmPassword) {
          this.setState({ passwordMatchError: 'Las contraseñas no coinciden' });
        } else {
          this.setState({ passwordMatchError: '' });
        }
      }
    });
  };

  onChangeUserType = (e) => {
    this.setState({
      userType: e.target.value,
      error: '', // Clear error when user types
    });
  };

  onSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (this.state.password !== this.state.confirmPassword) {
      this.setState({ 
        passwordMatchError: 'Las contraseñas no coinciden',
        error: ''
      });
      return;
    }
    
    this.setState({ loading: true, error: '', passwordMatchError: '' });
    
    const newUser = {
      fullname: this.state.fullname,
      email: this.state.email,
      password: this.state.password,
      userType: this.state.userType,
    };
    
    try {
      const res = await axios.post('http://localhost:4000/api/auth/signup', newUser);
      
      // Registration successful - redirect to login with email as query parameter
      console.log('Registration successful, redirecting to login...');
      console.log('Response status:', res.status);
      console.log('Response data:', res.data);
      
      // Reset loading state
      this.setState({ loading: false });
      
      // Navigate to login with email
      const emailParam = encodeURIComponent(this.state.email);
      this.props.navigate(`/login?email=${emailParam}`, { replace: true });
    } catch (error) {
      console.error('Error creating user:', error);
      console.error('Error response:', error.response);
      
      // Show user-friendly error message
      let errorMessage = 'Error al crear la cuenta. Por favor, intenta de nuevo.';
      
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
        errorMessage = 'El correo electrónico ya está registrado.';
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
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Crear Cuenta</h2>
          <p>Crea tu cuenta para empezar.</p>
          {this.state.error && (
            <div className="alert alert-danger" role="alert">
              {this.state.error}
            </div>
          )}
          <form onSubmit={this.onSubmit}>
            <div className="input-group">
              <label htmlFor="fullname">Nombre Completo</label>
              <input
                type="text"
                id="fullname"
                placeholder="Ingresa tu nombre completo"
                onChange={this.onChangeFullname}
                value={this.state.fullname}
                required
                disabled={this.state.loading}
              />
            </div>
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
                minLength="8"
                className={this.state.passwordMatchError ? 'input-error' : ''}
              />
            </div>
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirmar Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirma tu contraseña"
                onChange={this.onChangeConfirmPassword}
                value={this.state.confirmPassword}
                required
                disabled={this.state.loading}
                minLength="8"
                className={this.state.passwordMatchError ? 'input-error' : ''}
              />
              {this.state.passwordMatchError && (
                <span className="error-message">{this.state.passwordMatchError}</span>
              )}
            </div>
            <div className="input-group">
              <label htmlFor="userType">Tipo de Usuario</label>
              <select
                id="userType"
                onChange={this.onChangeUserType}
                value={this.state.userType}
                required
                disabled={this.state.loading}
                className="user-type-select"
              >
                <option value="Estudiante">Estudiante</option>
                <option value="Tutor">Tutor</option>
                <option value="Asesor">Asesor</option>
              </select>
            </div>
            <button 
              type="submit" 
              className="sign-in-btn"
              disabled={this.state.loading}
            >
              {this.state.loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>
        </div>
      </div>
    );
  }
}

export default CreateUserWrapper;
