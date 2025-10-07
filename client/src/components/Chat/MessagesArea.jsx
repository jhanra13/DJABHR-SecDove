import { useEffect, useRef } from 'react';
import Message from './Message';
import { useAuth } from '../../context/AuthContext';

function MessagesArea({ discussion, messages = [], loading, error }) {
    const messagesEndRef = useRef(null);
    const { currentSession } = useAuth();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Ensure messages is always an array
    const messageList = Array.isArray(messages) ? messages : [];

    if (loading) {
        return (
            <div className="messages-area">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#BBB',
                    fontSize: '14px'
                }}>
                    Loading messages...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="messages-area">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#BBB',
                    fontSize: '14px'
                }}>
                    Error loading messages: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="messages-area">
            {messageList.length === 0 ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#BBB',
                    fontSize: '14px'
                }}>
                    No messages yet. Start a conversation!
                </div>
            ) : (
                messageList.map(message => (
                    <Message
                        key={message.id}
                        text={message.content}
                        sender={message.sender}
                        isSent={message.sender === currentSession?.username}
                        time={new Date(message.timestamp).toLocaleString()}
                        avatarUrl={message.sender === currentSession?.username ? '' : discussion?.avatarUrl}
                    />
                ))
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessagesArea;