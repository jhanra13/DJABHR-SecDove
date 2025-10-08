import './ChatWindow.css';
import ChatHeader from './ChatHeader';
import MessagesArea from './MessagesArea';
import ChatFooter from './ChatFooter';

function ChatWindow({ discussion, messages, sendMessage, loading, error, onNewConversation, onAddParticipant }) {
    return (
        <section className="chat-window">
            <ChatHeader
                discussion={discussion}
                onNewConversation={onNewConversation}
                onAddParticipant={onAddParticipant}
            />
            <MessagesArea discussion={discussion} messages={messages} loading={loading} error={error} />
            <ChatFooter conversationId={discussion?.id} />
        </section>
    );
}

export default ChatWindow;
