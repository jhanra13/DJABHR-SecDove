import { useState } from 'react';
import './LoginModal.css';
import { useAuth } from '../../context/AuthContext';

function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!formData.username || !formData.password) {
            setError('Please enter both username and password');
            setLoading(false);
            return;
        }

        try {
            await login(formData.username, formData.password);
            // Clear form on success
            setFormData({ username: '', password: '', rememberMe: false });
            onClose();
        } catch (err) {
            // Extract user-friendly error message
            let errorMessage = 'Login failed';
            
            if (err.response?.status === 401) {
                errorMessage = 'Invalid username or password';
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="login-modal-content">
                <div className="login-logo">
                    <div className="logo-circle">SD</div>
                </div>

                <h2 className="login-title">Welcome Back</h2>

                {error && <div className="login-error">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="login-username">Username</label>
                        <input
                            type="text"
                            id="login-username"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            placeholder="Enter your username"
                            autoFocus
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password">Password</label>
                        <input
                            type="password"
                            id="login-password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-check">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={formData.rememberMe}
                            onChange={(e) => setFormData({...formData, rememberMe: e.target.checked})}
                            disabled={loading}
                        />
                        <label htmlFor="rememberMe">Remember me</label>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>

                    <p className="login-footer">
                        Don't have an account?{' '}
                        <button type="button" className="link-button" onClick={onSwitchToRegister} disabled={loading}>
                            Register here
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default LoginModal;