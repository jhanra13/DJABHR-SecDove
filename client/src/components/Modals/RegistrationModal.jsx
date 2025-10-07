import { useState } from 'react';
import './Modal.css';
import { useAuth } from '../../context/AuthContext';

function RegistrationModal({ isOpen, onClose, onSwitchToLogin }) {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [usernameChecking, setUsernameChecking] = useState(false);

    const { register, checkUsernameExists } = useAuth();

    // Check username when field loses focus
    const handleUsernameBlur = async () => {
        if (!formData.username || formData.username.length < 3) return;
        
        setUsernameChecking(true);
        try {
            const exists = await checkUsernameExists(formData.username);
            if (exists) {
                setError('Username already exists');
            } else {
                setError('');
            }
        } catch (err) {
            console.error('Username check error:', err);
        } finally {
            setUsernameChecking(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!formData.username || !formData.password || !formData.confirmPassword) {
            setError('All fields are required');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        try {
            await register(formData.username, formData.password);
            setSuccess('Account created successfully! Logging in...');
            setFormData({ username: '', password: '', confirmPassword: '' });
            
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err) {
            // Extract user-friendly error message
            let errorMessage = 'Registration failed';
            
            if (err.response?.status === 409) {
                errorMessage = 'Username already exists';
            } else if (err.response?.status === 400) {
                errorMessage = err.response.data?.error || 'Invalid registration data';
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
            <div className="modal-content">
                <div className="modal-header">
                    <h2 className="modal-title">Create Account</h2>
                </div>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={formData.username}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                            onBlur={handleUsernameBlur}
                            placeholder="Choose a username"
                            disabled={loading}
                        />
                        {usernameChecking && <small>Checking availability...</small>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            placeholder="Enter password"
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                            placeholder="Confirm password"
                            disabled={loading}
                        />
                    </div>
                    {error && <div className="status-message error">{error}</div>}
                    {success && <div className="status-message success">{success}</div>}
                    <button type="submit" className="modal-button" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <p className="login-footer">
                        Already have an account?{' '}
                        <button type="button" className="link-button" onClick={onSwitchToLogin} disabled={loading}>
                            Log in here
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default RegistrationModal;