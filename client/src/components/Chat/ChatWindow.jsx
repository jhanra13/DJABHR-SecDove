import './ChatWindow.css';
import ChatHeader from './ChatHeader';
import MessagesArea from './MessagesArea';
import ChatFooter from './ChatFooter';

function ChatWindow({ discussion, messages, sendMessage, loading, error }) {
    return (
        <section className="chat-window">
            <ChatHeader discussion={discussion} />
            <MessagesArea discussion={discussion} messages={messages} loading={loading} error={error} />
            <ChatFooter recipient={discussion?.name} discussion={discussion} sendMessage={sendMessage} />
        </section>
    );
}

export default ChatWindow;