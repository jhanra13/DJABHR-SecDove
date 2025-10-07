import { useState, useEffect } from 'react';
import './Modal.css';
import { useContacts } from '../../context/ContactsContext';
import { useConversations } from '../../context/ConversationsContext';

function NewConversationModal({ isOpen, onClose, onConversationCreated }) {
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { contacts } = useContacts();
    const { createConversation } = useConversations();

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setSelectedContacts([]);
            setError('');
        }
    }, [isOpen]);

    const handleToggleContact = (contactUsername) => {
        setSelectedContacts(prev => {
            if (prev.includes(contactUsername)) {
                return prev.filter(u => u !== contactUsername);
            } else {
                return [...prev, contactUsername];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (selectedContacts.length === 0) {
            setError('Please select at least one contact');
            return;
        }

        setLoading(true);

        try {
            // Create conversation with selected contacts
            const result = await createConversation(selectedContacts);
            
            // Clear selection
            setSelectedContacts([]);
            
            // Show message if conversation already exists
            if (result.isExisting) {
                console.log('Conversation already exists, selecting existing conversation');
            }
            
            // Notify parent component
            if (onConversationCreated) {
                onConversationCreated(result.conversation);
            }
            
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create conversation');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">New Conversation</h2>
                </div>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Select Recipients</label>
                        {contacts.length === 0 ? (
                            <div style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#999',
                                backgroundColor: '#f5f5f5',
                                borderRadius: '8px',
                                marginTop: '10px'
                            }}>
                                No contacts yet. Add contacts first to start a conversation.
                            </div>
                        ) : (
                            <div style={{
                                maxHeight: '300px',
                                overflowY: 'auto',
                                border: '1px solid #E0E0E0',
                                borderRadius: '8px',
                                padding: '10px',
                                marginTop: '10px'
                            }}>
                                {contacts.map((contact) => (
                                    <label
                                        key={contact.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '10px',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            transition: 'background-color 0.2s',
                                            marginBottom: '5px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!loading) e.currentTarget.style.backgroundColor = '#f5f5f5';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedContacts.includes(contact.contact_username)}
                                            onChange={() => handleToggleContact(contact.contact_username)}
                                            disabled={loading}
                                            style={{
                                                marginRight: '10px',
                                                width: '18px',
                                                height: '18px',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <span style={{ fontSize: '14px' }}>{contact.contact_username}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {selectedContacts.length > 0 && (
                            <div style={{
                                marginTop: '10px',
                                padding: '10px',
                                backgroundColor: '#E3F2FD',
                                borderRadius: '6px',
                                fontSize: '13px',
                                color: '#1976D2'
                            }}>
                                {selectedContacts.length} contact(s) selected
                            </div>
                        )}
                    </div>
                    {error && <div className="status-message error">{error}</div>}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="modal-button"
                            disabled={loading}
                            style={{
                                flex: 1,
                                backgroundColor: '#f5f5f5',
                                color: '#666'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="modal-button"
                            disabled={loading || contacts.length === 0 || selectedContacts.length === 0}
                            style={{ flex: 1 }}
                        >
                            {loading ? 'Creating...' : 'Create Conversation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewConversationModal;
