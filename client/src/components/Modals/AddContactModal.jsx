import { useState } from 'react';
import './Modal.css';
import { useContacts } from '../../context/ContactsContext';
import { useAuth } from '../../context/AuthContext';

function AddContactModal({ isOpen, onClose }) {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const { addContact } = useContacts();
    const { checkUsernameExists } = useAuth();

    // Check if username exists when field loses focus
    const handleUsernameBlur = async () => {
        if (!username.trim()) return;
        
        setChecking(true);
        setError('');
        try {
            const exists = await checkUsernameExists(username.trim());
            if (!exists) {
                setError('User not found');
            }
        } catch (err) {
            console.error('Username check error:', err);
        } finally {
            setChecking(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!username.trim()) {
            setError('Username is required');
            setLoading(false);
            return;
        }

        try {
            await addContact(username.trim());
            setUsername(''); // Clear input on success
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to add contact');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add Contact</h2>
                </div>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="contact-username">Username</label>
                        <input
                            type="text"
                            id="contact-username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onBlur={handleUsernameBlur}
                            placeholder="Enter contact's username"
                            autoFocus
                            disabled={loading}
                        />
                        {checking && <small>Checking user...</small>}
                    </div>
                    {error && <div className="status-message error">{error}</div>}
                    <button type="submit" className="modal-button" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Contact'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AddContactModal;