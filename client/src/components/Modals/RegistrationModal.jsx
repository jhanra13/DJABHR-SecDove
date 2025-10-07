import { useState } from 'react';
import './Modal.css';
import { useAuthContext } from '../../context/AuthContext';

function RegistrationModal({ isOpen, onClose, onSwitchToLogin }) {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const { register } = useAuthContext();

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

        try {
            // Call registration API
            await register(formData.username, formData.password);

            // Show success message
            setSuccess('Account created successfully! Please log in.');

            // Clear form
            setFormData({ username: '', password: '', confirmPassword: '' });

            // Switch to login after 2 seconds
            setTimeout(() => {
                onSwitchToLogin();
            }, 2000);
        } catch (err) {
            setError(err.message || 'Registration failed. Username may already exist.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
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
                            placeholder="Choose a username"
                            disabled={loading}
                        />
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