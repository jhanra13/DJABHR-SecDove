import { useState } from 'react';
import { useContacts } from '../../context/ContactsContext';
import { useAuth } from '../../context/AuthContext';
import './ContactsView.css';

function ContactsView() {
    const { contacts, loading, error, deleteContact, blockContact } = useContacts();
    const { currentSession } = useAuth();
    const [showAddContact, setShowAddContact] = useState(false);
    const [newContactUsername, setNewContactUsername] = useState('');

    const handleAddContact = async (e) => {
        e.preventDefault();
        if (!newContactUsername.trim()) return;

        try {
            await addNewContact(newContactUsername.trim());
            setNewContactUsername('');
            setShowAddContact(false);
        } catch (err) {
            console.error('Failed to add contact:', err);
        }
    };

    const handleDeleteContact = async (contactUsername) => {
        if (window.confirm(`Are you sure you want to remove ${contactUsername} from your contacts?`)) {
            try {
                await deleteContact(contactUsername);
            } catch (err) {
                console.error('Failed to delete contact:', err);
            }
        }
    };

    const handleBlockContact = async (contactUsername) => {
        if (window.confirm(`Are you sure you want to block ${contactUsername}?`)) {
            try {
                await blockContact(contactUsername);
            } catch (err) {
                console.error('Failed to block contact:', err);
            }
        }
    };

    if (loading) {
        return (
            <div className="contacts-view">
                <div className="loading">Loading contacts...</div>
            </div>
        );
    }

    return (
        <div className="contacts-view">
            <div className="contacts-header">
                <h2>Contacts</h2>
                <button 
                    className="add-contact-btn"
                    onClick={() => setShowAddContact(true)}
                >
                    Add Contact
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {showAddContact && (
                <div className="add-contact-form">
                    <form onSubmit={handleAddContact}>
                        <input
                            type="text"
                            placeholder="Enter username"
                            value={newContactUsername}
                            onChange={(e) => setNewContactUsername(e.target.value)}
                            autoFocus
                        />
                        <div className="form-actions">
                            <button type="submit">Add</button>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setShowAddContact(false);
                                    setNewContactUsername('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="contacts-list">
                {contacts.length === 0 ? (
                    <div className="no-contacts">
                        No contacts yet. Add some contacts to start messaging!
                    </div>
                ) : (
                    contacts.map((contact) => (
                        <div key={contact.id} className={`contact-item ${contact.is_blocked ? 'blocked' : ''}`}>
                            <div className="contact-info">
                                <div className="contact-name">
                                    {contact.nickname || contact.contact_username}
                                </div>
                                <div className="contact-username">@{contact.contact_username}</div>
                                {contact.is_blocked && (
                                    <div className="blocked-indicator">Blocked</div>
                                )}
                            </div>
                            <div className="contact-actions">
                                {!contact.is_blocked && (
                                    <button
                                        className="block-btn"
                                        onClick={() => handleBlockContact(contact.contact_username)}
                                        title="Block contact"
                                    >
                                        Block
                                    </button>
                                )}
                                <button
                                    className="delete-btn"
                                    onClick={() => handleDeleteContact(contact.contact_username)}
                                    title="Remove contact"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ContactsView;