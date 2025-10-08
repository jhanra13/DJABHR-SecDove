import { useEffect, useState } from 'react';
import './Modal.css';

function AddParticipantModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  error = '',
  conversation
}) {
  const [username, setUsername] = useState('');
  const [shareHistory, setShareHistory] = useState(true);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setShareHistory(true);
      setLocalError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim()) {
      setLocalError('Username is required');
      return;
    }
    setLocalError('');
    try {
      await onSubmit({ username: username.trim(), shareHistory });
    } catch {
      // Parent handles error display via props
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
            <label htmlFor="participant-username">Username</label>
            <input
              id="participant-username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
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
            <button type="submit" className="modal-button" disabled={loading}>
              {loading ? 'Adding...' : 'Add Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddParticipantModal;
