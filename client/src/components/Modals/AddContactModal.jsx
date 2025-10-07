import { useState } from 'react';
import './Modal.css';
import { useContactsContext } from '../../context/ContactsContext';

function AddContactModal({ isOpen, onClose }) {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { addNewContact } = useContactsContext();

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
            await addNewContact(username.trim());
            setUsername('');
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
                            placeholder="Enter contact's username"
                            autoFocus
                            disabled={loading}
                        />
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