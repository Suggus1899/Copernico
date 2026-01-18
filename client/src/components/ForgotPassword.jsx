import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import { Link } from "react-router-dom";

class ForgotPassword extends Component {
  state = {
    email: '',
    message: '',
    error: '',
    loading: false,
    emailSent: false,
  };

  onChangeEmail = (e) => {
    this.setState({
      email: e.target.value,
      error: '', // Clear error when user types
      message: '', // Clear message when user types
    });
  };

  onSubmit = async (e) => {
    e.preventDefault();
    this.setState({ loading: true, error: '', message: '' });

    try {
      const res = await apiClient.post(`/auth/forgot-password`, { email: this.state.email });

      this.setState({
        emailSent: true,
        message: 'Se ha enviado un enlace de recuperación a tu correo electrónico.',
        loading: false
      });
    } catch (error) {
      console.error('Error sending forgot password email:', error);

      let errorMessage = 'Error al enviar el correo de recuperación.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'No se encontró una cuenta con ese correo electrónico.';
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
          <h2>Recuperar Contraseña</h2>
          <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>

          {this.state.message && (
            <div className="alert alert-success" role="alert">
              {this.state.message}
            </div>
          )}

          {this.state.error && (
            <div className="alert alert-danger" role="alert">
              {this.state.error}
            </div>
          )}

          {!this.state.emailSent ? (
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

              <button
                type="submit"
                className="sign-in-btn"
                disabled={this.state.loading}
              >
                {this.state.loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p>¿No recibiste el correo? Revisa tu carpeta de spam o intenta nuevamente.</p>
              <button
                onClick={() => this.setState({ emailSent: false, message: '', error: '' })}
                className="sign-in-btn"
                style={{ marginTop: '20px' }}
              >
                Intentar de Nuevo
              </button>
            </div>
          )}

          <p className="signup-link">
            <Link to="/login">← Volver al Inicio de Sesión</Link>
          </p>
        </div>
      </div>
    );
  }
}

export default ForgotPassword;
