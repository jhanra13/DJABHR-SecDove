function Message({ text, isSent, avatarUrl, time }) {
  return (
    <div className={`message ${isSent ? 'sent' : ''}`}>
      <div className="message-content">
        <div
          className="message-avatar"
          style={{ backgroundImage: `url(${avatarUrl})` }}
        />
        <div className="message-text">{text}</div>
        <span className="message-time">{time}</span>
      </div>
    </div>
  );
}

export default Message;
