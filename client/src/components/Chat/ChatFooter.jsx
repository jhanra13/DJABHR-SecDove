import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSmile } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useMessages } from '../../context/MessagesContext';

function ChatFooter({ conversationId }) {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const { currentSession } = useAuth();
    const { sendMessage } = useMessages();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!message.trim() || sending) return;

        if (!currentSession) {
            alert('Please log in first');
            return;
        }

        if (!conversationId) {
            alert('Please select a conversation');
            return;
        }

        setSending(true);
        try {
            await sendMessage(conversationId, message.trim());
            setMessage(''); // Clear input on success
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form className="chat-footer" onSubmit={handleSubmit}>
            <button type="button" className="icon">
                <FontAwesomeIcon icon={faSmile} />
            </button>
            <input
                type="text"
                className="message-input"
                placeholder={currentSession ? "Type your message..." : "Please log in"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!currentSession || sending}
            />
            <button type="submit" className="send-button" disabled={!currentSession || !message.trim() || sending}>
                <FontAwesomeIcon icon={faPaperPlane} />
            </button>
        </form>
    );
}

export default ChatFooter;