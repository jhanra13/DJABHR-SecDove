import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faEllipsisV } from '@fortawesome/free-solid-svg-icons';

function ChatHeader({ discussion }) {
  return (
    <div className="chat-header">
      <FontAwesomeIcon icon={faUserCircle} className="icon" />
      <h2 className="name">{discussion?.name || 'Select a conversation'}</h2>
      <FontAwesomeIcon icon={faEllipsisV} className="menu-icon" />
    </div>
  );
}

export default ChatHeader;
