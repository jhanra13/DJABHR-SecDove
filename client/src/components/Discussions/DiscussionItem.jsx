function DiscussionItem({
  id,
  name,
  message,
  time,
  avatarUrl,
  isOnline,
  isActive,
  onClick
}) {
  return (
    <div
      className={`discussion-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick?.(id)}
    >
      <div
        className="discussion-avatar"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      >
        {isOnline && <div className="online-indicator pulse" />}
      </div>
      <div className="discussion-content">
        <h3 className="discussion-name">{name}</h3>
        <p className="discussion-message">{message}</p>
      </div>
      <span className="discussion-time">{time}</span>
    </div>
  );
}

export default DiscussionItem;
