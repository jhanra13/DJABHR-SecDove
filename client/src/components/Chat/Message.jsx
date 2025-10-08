function Message({ text, sender, isSent, avatarUrl, time, onEdit, onDelete, edited }) {
  const showActions = isSent && (onEdit || onDelete);
  return (
    <div className={`message ${isSent ? 'sent' : ''}`}>
      <div className="message-content">
        <div
          className="message-avatar"
          style={{ backgroundImage: `url(${avatarUrl})` }}
        />
        <div className="message-body">
          {!isSent && sender && (
            <div className="message-sender">{sender}</div>
          )}
          <div className="message-text">
            {text}
            {edited && <span className="message-edited">(edited)</span>}
          </div>
          <span className="message-time">{time}</span>
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
