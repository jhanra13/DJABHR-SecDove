import { useEffect, useRef } from 'react';
import Message from './Message';
import { useAuthContext } from '../../context/AuthContext';

function MessagesArea({ discussion, messages, loading, error }) {
    const messagesEndRef = useRef(null);
    const { user } = useAuthContext();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            {messages.length === 0 ? (
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
                messages.map(message => (
                    <Message
                        key={message.id}
                        text={message.content}
                        isSent={message.sender_id === user?.id}
                        time={new Date(message.sent_at).toLocaleTimeString()}
                        avatarUrl={message.sender_id === user?.id ? '' : discussion?.avatarUrl}
                    />
                ))
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessagesArea;