function Message({ text, sender, isSent, avatarUrl, time }) {
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
          <div className="message-text">{text}</div>
          <span className="message-time">{time}</span>
        </div>
      </div>
    </div>
  );
}

export default Message;
