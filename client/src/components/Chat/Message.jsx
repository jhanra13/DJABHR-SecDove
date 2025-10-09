function Message({ text, sender, isSent, avatarUrl, time, onEdit, onDelete, edited, system }) {
  const showActions = isSent && !system && (onEdit || onDelete);
  return (
    <div className={`message ${isSent ? 'sent' : ''} ${system ? 'system' : ''}`}>
      <div className="message-content">
        {!system && (
          <div
            className="message-avatar"
            style={{ backgroundImage: `url(${avatarUrl})` }}
          />
        )}
        <div className="message-body">
          {!system && !isSent && sender && (
            <div className="message-sender">{sender}</div>
          )}
          <div className={`message-text${system ? ' system' : ''}`}>
            {text}
            {edited && <span className="message-edited">(edited)</span>}
          </div>
          {!system && <span className="message-time">{time}</span>}
          {showActions && (
            <div className="message-actions">
              {onEdit && (
                <button type="button" onClick={onEdit}>
                  Edit
                </button>
              )}
              {onDelete && (
                <button type="button" onClick={onDelete}>
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Message;
