import { useState } from 'react';
import './Modal.css';

function ConnectionModal({ isOpen, onClose, onConnect }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!username.trim()) {
      setStatus({ type: 'error', message: 'Username is required' });
      return;
    }

    setStatus({ type: 'success', message: 'Connecting...' });
    onConnect?.(username);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Connect to SecDove</h2>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="connect-username">Username</label>
            <input
              type="text"
              id="connect-username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoFocus
            />
          </div>
          {status.message && (
            <div className={`status-message ${status.type}`}>
              {status.message}
            </div>
          )}
          <button type="submit" className="modal-button">Connect</button>
        </form>
      </div>
    </div>
  );
}

export default ConnectionModal;
