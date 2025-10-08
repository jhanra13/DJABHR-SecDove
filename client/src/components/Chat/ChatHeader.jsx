import UserPlusIcon from '../icons/UserPlusIcon';

const buttonStyle = {
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
};

const UserIcon = ({ className }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6Z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
  </svg>
);

const DotsIcon = ({ className, style }) => (
  <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M5 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
  </svg>
);

function ChatHeader({ discussion, onNewConversation, onAddParticipant, onLeaveConversation }) {
  const handleMouseEnter = (event) => {
    event.currentTarget.style.transform = 'scale(1.05)';
    event.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  };

  const handleMouseLeave = (event) => {
    event.currentTarget.style.transform = 'scale(1)';
    event.currentTarget.style.boxShadow = 'none';
  };

  const actions = [];

  if (discussion && onAddParticipant) {
    actions.push(
      <button
        key="add-participant"
        onClick={() => onAddParticipant(discussion)}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Add participant"
      >
        <UserPlusIcon size={16} />
      </button>
    );
  }

  if (discussion && onLeaveConversation) {
    actions.push(
      <button
        key="leave"
        onClick={() => onLeaveConversation(discussion)}
        style={{ ...buttonStyle, background: '#f25f5c' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Leave conversation"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M10 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6v-2H4V4h6zM21 12l-5-5v3h-6v4h6v3z" />
        </svg>
      </button>
    );
  }

  actions.push(
    <button
      key="new-conversation"
      onClick={onNewConversation}
      style={buttonStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title="New conversation"
    >
        <PlusIcon />
      </button>
  );

  return (
    <div className="chat-header">
      <UserIcon className="icon" />
      <h2 className="name">{discussion?.name || 'Select a conversation'}</h2>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
        {actions}
        <DotsIcon className="menu-icon" style={{ marginLeft: 0 }} />
      </div>
    </div>
  );
}

export default ChatHeader;
