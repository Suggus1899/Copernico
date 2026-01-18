import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
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
		confirmemail: '',
		password: '',
		confirmPassword: '',
		userType: '',
		error: '',
		passwordMatchError: '',
		passwordPolicyError: '',
		emailMatchError: '',
		username: '',
		loading: false,
	};

	onChangeFullname = (e) => {
		this.setState({
			fullname: e.target.value,
			error: '',
		});
	};

	onChangeEmail = (e) => {
		const value = e.target.value;
		this.setState(
			{
				email: value,
				error: '',
				emailMatchError: '',
			},
			() => {
				if (this.state.confirmemail && this.state.email !== this.state.confirmemail) {
					this.setState({ emailMatchError: 'Los correos no coinciden' });
				} else if (this.state.confirmemail && this.state.email === this.state.confirmemail) {
					this.setState({ emailMatchError: '' });
				}
			}
		);
	};

	onChangeConfirmemail = (e) => {
		const value = e.target.value;
		this.setState(
			{
				confirmemail: value,
				error: '',
			},
			() => {
				if (this.state.email && this.state.confirmemail) {
					if (this.state.email !== this.state.confirmemail) {
						this.setState({ emailMatchError: 'Los correos no coinciden' });
					} else {
						this.setState({ emailMatchError: '' });
					}
				}
			}
		);
	};

	onChangePassword = (e) => {
		const value = e.target.value;
		this.setState(
			{
				password: value,
				error: '',
				passwordMatchError: '',
				passwordPolicyError: '',
			},
			() => {
				if (this.state.confirmPassword && this.state.password !== this.state.confirmPassword) {
					this.setState({ passwordMatchError: 'Las contraseñas no coinciden' });
				} else if (this.state.confirmPassword && this.state.password === this.state.confirmPassword) {
					this.setState({ passwordMatchError: '' });
				}
			}
		);
	};

	onChangeConfirmPassword = (e) => {
		const value = e.target.value;
		this.setState(
			{
				confirmPassword: value,
				error: '',
			},
			() => {
				if (this.state.password && this.state.confirmPassword) {
					if (this.state.password !== this.state.confirmPassword) {
						this.setState({ passwordMatchError: 'Las contraseñas no coinciden' });
					} else {
						this.setState({ passwordMatchError: '' });
					}
				}
			}
		);
	};

	onChangeUserType = (e) => {
		this.setState({
			userType: e.target.value,
			error: '',
		});
	};

	// Handler username
	onChangeUsername = (e) => {
		this.setState({ username: e.target.value });
	};

	onSubmit = async (e) => {
		e.preventDefault();

		// Validaciones antes de activar loading
		const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
		if (!passwordPolicyRegex.test(this.state.password)) {
			this.setState({
				passwordPolicyError: 'La contraseña debe tener al menos 8 caracteres e incluir mayúscula, minúscula y número.',
				error: '',
				loading: false,
			});
			return;
		}

		if ((this.state.email || '') !== (this.state.confirmemail || '')) {
			this.setState({
				emailMatchError: 'Los correos no coinciden',
				error: '',
				loading: false,
			});
			return;
		}

		if ((this.state.password || '') !== (this.state.confirmPassword || '')) {
			this.setState({
				passwordMatchError: 'Las contraseñas no coinciden',
				error: '',
				loading: false,
			});
			return;
		}

		// Validar que se haya seleccionado un tipo de cuenta
		if (!this.state.userType) {
			this.setState({
				error: 'Por favor selecciona un tipo de cuenta',
				loading: false,
			});
			return;
		}

		// Si pasa validaciones, activar loading y limpiar errores
		this.setState({ loading: true, error: '', emailMatchError: '', passwordMatchError: '', passwordPolicyError: '' });

		// Normalizar y construir payload compatible con el backend
		const fullname = (this.state.fullname || '').trim().replace(/\s+/g, ' ');
		const [firstName, ...rest] = fullname.split(' ');
		const lastName = rest.join(' ');

		const roleMap = {
			Estudiante: 'student',
			Tutor: 'tutor',
			Asesor: 'advisor',
		};
		const role = roleMap[this.state.userType] || 'student';

		const newUser = {
			email: (this.state.email || '').trim(),
			password: (this.state.password || '').trim(),
			confirmPassword: (this.state.confirmPassword || '').trim(),
			role,
			personalInfo: {
				firstName: firstName || fullname || 'Usuario',
				lastName: lastName || '',
				username: (this.state.username || '').trim(),
				email: (this.state.email || '').trim(),
			},
		};

		try {
			const res = await apiClient.post(`/auth/signup`, newUser);
			this.setState({ loading: false });

			const emailParam = encodeURIComponent(this.state.email);
			this.props.navigate(`/login?email=${emailParam}`, { replace: true });
		} catch (error) {
			console.error('Error creating user:', error);
			console.error('Error response:', error.response);

			let errorMessage = 'Error al crear la cuenta. Por favor, intenta de nuevo.';

			if (error.response?.data) {
				const errorData = error.response.data;

				if (typeof errorData === 'string') {
					errorMessage = errorData;
				} else if (errorData.error) {
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
				const apiMsg = error.response?.data?.error || error.response?.data?.message;
				if (apiMsg && /password/i.test(apiMsg)) {
					errorMessage = 'La contraseña no cumple los requisitos (8+ con mayúscula, minúscula y número).';
				} else {
					errorMessage = 'Verifica los datos enviados. El correo podría estar registrado o faltar información.';
				}
			} else if (!error.response) {
				errorMessage = 'Error de conexión. Verifica que el servidor esté corriendo.';
			}

			this.setState({ error: errorMessage, loading: false });
		}
	};

	render() {
		return (
			<div className="signup-container">
				<div className="signup-card">
					<div className="signup-header">
						<h2>Crear Cuenta</h2>
						<p>Únete a S.I Copernico Academy</p>
					</div>

					{this.state.error && (
						<div className="alert alert-danger" role="alert">
							{this.state.error}
						</div>
					)}

					<form onSubmit={this.onSubmit}>
						{/* Selección de tipo de cuenta con tarjetas */}
						<div className="account-type-section">
							<h3>¿Qué tipo de cuenta deseas crear?</h3>
							<div className="account-type-cards">
								<div
									className={`account-type-card ${this.state.userType === 'Estudiante' ? 'selected' : ''}`}
									onClick={() => this.setState({ userType: 'Estudiante' })}
								>
									<div className="card-icon">🎓</div>
									<div className="card-content">
										<h4>Estudiante</h4>
										<p>Acceso a cursos, tutores y materiales educativos</p>
									</div>
									<div className={`card-radio ${this.state.userType === 'Estudiante' ? 'checked' : ''}`}>
										<div className="radio-dot"></div>
									</div>
								</div>

								<div
									className={`account-type-card ${this.state.userType === 'Tutor' ? 'selected' : ''}`}
									onClick={() => this.setState({ userType: 'Tutor' })}
								>
									<div className="card-icon">👨‍🏫</div>
									<div className="card-content">
										<h4>Tutor</h4>
										<p>Ofrece tutorías y comparte conocimientos</p>
									</div>
									<div className={`card-radio ${this.state.userType === 'Tutor' ? 'checked' : ''}`}>
										<div className="radio-dot"></div>
									</div>
								</div>

								<div
									className={`account-type-card ${this.state.userType === 'Asesor' ? 'selected' : ''}`}
									onClick={() => this.setState({ userType: 'Asesor' })}
								>
									<div className="card-icon">💼</div>
									<div className="card-content">
										<h4>Asesor</h4>
										<p>Proporciona asesorías especializadas</p>
									</div>
									<div className={`card-radio ${this.state.userType === 'Asesor' ? 'checked' : ''}`}>
										<div className="radio-dot"></div>
									</div>
								</div>
							</div>
							{!this.state.userType && (
								<div className="error-message">Por favor selecciona un tipo de cuenta</div>
							)}
						</div>

						{/* Información personal */}
						<div className="form-section">
							<h3>Información Personal</h3>
							<div className="form-grid">
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
									<label htmlFor="username">Nombre de Usuario</label>
									<input
										type="text"
										id="username"
										placeholder="Elige un nombre de usuario"
										onChange={this.onChangeUsername}
										value={this.state.username}
										disabled={this.state.loading}
									/>
								</div>
							</div>
						</div>

						{/* Información de acceso */}
						<div className="form-section">
							<h3>Información de Acceso</h3>
							<div className="input-group">
								<label htmlFor="email">Correo Electrónico</label>
								<input
									type="email"
									id="email"
									placeholder="tu@email.com"
									onChange={this.onChangeEmail}
									value={this.state.email}
									required
									disabled={this.state.loading}
								/>
							</div>

							<div className="input-group">
								<label htmlFor="confirmemail">Confirmar Correo Electrónico</label>
								<input
									type="email"
									id="confirmemail"
									placeholder="Confirma tu correo electrónico"
									onChange={this.onChangeConfirmemail}
									value={this.state.confirmemail}
									required
									disabled={this.state.loading}
									className={this.state.emailMatchError ? 'input-error' : ''}
								/>
								{this.state.emailMatchError && (
									<span className="error-message">{this.state.emailMatchError}</span>
								)}
							</div>
						</div>

						{/* Seguridad */}
						<div className="form-section">
							<h3>Seguridad</h3>
							<div className="input-group">
								<label htmlFor="password">Contraseña</label>
								<input
									type="password"
									id="password"
									placeholder="Crea una contraseña segura"
									onChange={this.onChangePassword}
									value={this.state.password}
									required
									disabled={this.state.loading}
									minLength="8"
									className={this.state.passwordMatchError ? 'input-error' : ''}
								/>
								<div className="password-requirements">
									<small className="help-text">
										<span className="req-icon">✓</span> Al menos 8 caracteres
									</small>
									<small className="help-text">
										<span className="req-icon">✓</span> Una letra mayúscula
									</small>
									<small className="help-text">
										<span className="req-icon">✓</span> Una letra minúscula
									</small>
									<small className="help-text">
										<span className="req-icon">✓</span> Un número
									</small>
								</div>
								{this.state.passwordPolicyError && (
									<span className="error-message">{this.state.passwordPolicyError}</span>
								)}
							</div>

							<div className="input-group">
								<label htmlFor="confirmPassword">Confirmar Contraseña</label>
								<input
									type="password"
									id="confirmPassword"
									placeholder="Repite tu contraseña"
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
						</div>

						{/* Botón de registro */}
						<div className="form-actions">
							<button type="submit" className="signup-btn" disabled={this.state.loading}>
								{this.state.loading ? 'Creando cuenta...' : 'Crear Mi Cuenta'}
							</button>
						</div>
					</form>

					<div className="signup-footer">
						<p>¿Ya tienes una cuenta? <a href="/login">Inicia sesión</a></p>
					</div>
				</div>
			</div>
		);
	}
}

export default CreateUserWrapper;
