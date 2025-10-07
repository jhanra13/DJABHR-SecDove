import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSmile } from '@fortawesome/free-solid-svg-icons';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { useAuthContext } from '../../context/AuthContext';

function ChatFooter({ recipient, discussion, sendMessage }) {
    const [message, setMessage] = useState('');
    const { isConnected } = useWebSocketContext();
    const { user } = useAuthContext();

    const handleSubmit = async (e) => {
        e.preventDefault();

        console.log('handleSubmit called with message:', message);

        if (!message.trim()) {
            console.log('Message is empty, returning');
            return;
        }

        console.log('isConnected:', isConnected, 'discussion:', !!discussion, 'discussion.id:', discussion?.id, 'public_key:', !!discussion?.public_key);

        if (!isConnected) {
            alert('Not connected to server. Please log in first.');
            return;
        }

        if (!discussion) {
            alert('Please select a conversation');
            return;
        }

        if (!discussion.id) {
            alert('Invalid conversation - no contact ID');
            return;
        }

        if (!discussion.public_key) {
            alert('Contact public key not found. Cannot send encrypted message.');
            return;
        }

        console.log('ChatFooter - Sending message:', {
            sender: user?.username,
            recipient: discussion.name,
            messageLength: message.trim().length,
            hasSendMessage: !!sendMessage,
            discussionId: discussion.id,
            publicKeyLength: discussion.public_key?.length
        });

        try {
            await sendMessage(message.trim(), discussion.public_key);
            setMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message: ' + error.message);
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
                placeholder={isConnected ? "Type your message..." : "Connect to send messages"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!isConnected}
            />
            <button type="submit" className="send-button" disabled={!isConnected || !message.trim()}>
                <FontAwesomeIcon icon={faPaperPlane} />
            </button>
        </form>
    );
}

export default ChatFooter;