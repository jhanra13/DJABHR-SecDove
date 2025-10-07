import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faEllipsisV, faPlus } from '@fortawesome/free-solid-svg-icons';

function ChatHeader({ discussion, onNewConversation }) {
  return (
    <div className="chat-header">
      <FontAwesomeIcon icon={faUserCircle} className="icon" />
      <h2 className="name">{discussion?.name || 'Select a conversation'}</h2>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={onNewConversation}
          style={{
            background: 'linear-gradient(to right, #4768b5, #35488e)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          title="New Conversation"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
        <FontAwesomeIcon icon={faEllipsisV} className="menu-icon" style={{ marginLeft: 0 }} />
      </div>
    </div>
  );
}

export default ChatHeader;
