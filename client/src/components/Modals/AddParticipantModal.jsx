import { useEffect, useMemo, useState } from 'react';
import './Modal.css';
import { useContacts } from '../../context/ContactsContext';

function AddParticipantModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  error = '',
  conversation
}) {
  const { contacts } = useContacts();
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [shareHistory, setShareHistory] = useState(true);
  const [localError, setLocalError] = useState('');

  const existingParticipants = useMemo(
    () => new Set(conversation?.participants || []),
    [conversation?.participants]
  );

  const availableContacts = useMemo(
    () => contacts.filter(contact => !existingParticipants.has(contact.contact_username)),
    [contacts, existingParticipants]
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedContacts([]);
      setShareHistory(true);
      setLocalError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleContact = (username) => {
    setSelectedContacts(prev =>
      prev.includes(username)
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selectedContacts.length === 0) {
      setLocalError('Select at least one contact');
      return;
    }
    setLocalError('');
    try {
      await onSubmit({ usernames: selectedContacts, shareHistory });
    } catch {
      // parent handles error display
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Participant</h2>
          {conversation?.name && (
            <p className="modal-subtitle">Conversation: {conversation.name}</p>
          )}
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Contacts</label>
            {availableContacts.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#999',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                marginTop: '10px'
              }}>
                No additional contacts available.
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
                {availableContacts.map(contact => (
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
                      onChange={() => toggleContact(contact.contact_username)}
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

          <div className="form-group">
            <span>Share existing history?</span>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="share-history"
                  checked={shareHistory === true}
                  onChange={() => setShareHistory(true)}
                  disabled={loading}
                />
                Yes, grant access to previous messages
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="share-history"
                  checked={shareHistory === false}
                  onChange={() => setShareHistory(false)}
                  disabled={loading}
                />
                No, start sharing from now with a new encryption key
              </label>
            </div>
          </div>

          {(localError || error) && (
            <div className="status-message error">{localError || error}</div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="modal-button secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button"
              disabled={loading || availableContacts.length === 0}
            >
              {loading ? 'Adding...' : 'Add Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddParticipantModal;
