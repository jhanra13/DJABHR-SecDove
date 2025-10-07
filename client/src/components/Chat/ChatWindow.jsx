import './ChatWindow.css';
import ChatHeader from './ChatHeader';
import MessagesArea from './MessagesArea';
import ChatFooter from './ChatFooter';

function ChatWindow({ discussion, messages, sendMessage, loading, error, onNewConversation }) {
    return (
        <section className="chat-window">
            <ChatHeader discussion={discussion} onNewConversation={onNewConversation} />
            <MessagesArea discussion={discussion} messages={messages} loading={loading} error={error} />
            <ChatFooter conversationId={discussion?.id} />
        </section>
    );
}

export default ChatWindow;