import { useState, useEffect } from 'react';
import './AppContainer.css';
import Sidebar from '../Sidebar/Sidebar';
import DiscussionsList from '../Discussions/DiscussionsList';
import ChatWindow from '../Chat/ChatWindow';
import ContactsView from '../Contacts/ContactsView';
import SettingsView from '../Settings/SettingsView';
import AddContactModal from '../Modals/AddContactModal';
import NewConversationModal from '../Modals/NewConversationModal';
import { useViewContext, VIEWS } from '../../context/ViewContext';
import { useAuth } from '../../context/AuthContext';
import { useMessages } from '../../context/MessagesContext';
import { useConversations } from '../../context/ConversationsContext';
import AddParticipantModal from '../Modals/AddParticipantModal';

function AppContainer() {
    const [activeDiscussion, setActiveDiscussion] = useState(null);
    const [showAddContact, setShowAddContact] = useState(false);
    const [showNewConversation, setShowNewConversation] = useState(false);
    const [showAddParticipant, setShowAddParticipant] = useState(false);
    const [participantTarget, setParticipantTarget] = useState(null);
    const [participantError, setParticipantError] = useState('');
    const [participantLoading, setParticipantLoading] = useState(false);
    const { currentView } = useViewContext();
    const { currentSession } = useAuth();
    const { conversations, addParticipants, leaveConversation } = useConversations();
    
    // Get messages context
    const { getMessages, loadMessages, sendMessage, clearMessages, loading: messagesLoading, error: messagesError } = useMessages();
    
    // Get messages for the active discussion
    const messages = activeDiscussion ? getMessages(activeDiscussion.id) : [];

    // Load messages when conversation is selected
    useEffect(() => {
        if (activeDiscussion?.id) {
            loadMessages(activeDiscussion.id);
        }
    }, [activeDiscussion?.id, loadMessages]);

    // Keep the active discussion in sync with latest participant metadata
    useEffect(() => {
        if (!activeDiscussion?.id) return;
        const updated = conversations.find(convo => convo.id === activeDiscussion.id);
        if (updated && updated !== activeDiscussion) {
            setActiveDiscussion(updated);
        } else if (!updated) {
            setActiveDiscussion(null);
        }
    }, [conversations, activeDiscussion, activeDiscussion?.id]);

    // Reset active discussion when user logs out
    useEffect(() => {
        if (!currentSession) {
            setActiveDiscussion(null);
            setShowAddContact(false);
            setShowNewConversation(false);
            setShowAddParticipant(false);
            setParticipantTarget(null);
            setParticipantError('');
        }
    }, [currentSession]);

    // Handle new conversation created
    const handleConversationCreated = (conversation) => {
        // Automatically select the newly created conversation
        setActiveDiscussion(conversation);
    };

    const handleParticipantModalClose = () => {
        setShowAddParticipant(false);
        setParticipantTarget(null);
        setParticipantError('');
    };

    const handleOpenAddParticipant = (conversation) => {
        if (!conversation) return;
        setParticipantTarget(conversation);
        setParticipantError('');
        setShowAddParticipant(true);
    };

    const handleAddParticipant = async ({ usernames, shareHistory }) => {
        if (!participantTarget) return;
        if (!usernames || usernames.length === 0) {
            setParticipantError('Select at least one contact');
            return;
        }
        setParticipantLoading(true);
        setParticipantError('');
        try {
            await addParticipants(participantTarget.id, usernames, shareHistory);
            handleParticipantModalClose();
        } catch (err) {
            setParticipantError(err.message);
        } finally {
            setParticipantLoading(false);
        }
    };

    const handleLeaveConversation = async (conversation) => {
        if (!conversation) return;
        const confirmed = window.confirm('Leave this conversation? You will lose access unless re-added.');
        if (!confirmed) return;
        try {
            await leaveConversation(conversation.id);
            clearMessages(conversation.id);
            setActiveDiscussion(null);
        } catch (err) {
            window.alert(err.message || 'Failed to leave conversation');
        }
    };

    const renderView = () => {
        switch(currentView) {
            case VIEWS.DISCUSSIONS:
                return (
                    <>
                        <DiscussionsList
                            activeDiscussion={activeDiscussion}
                            onDiscussionSelect={setActiveDiscussion}
                            onAddContact={() => setShowAddContact(true)}
                        />
                        <ChatWindow 
                            discussion={activeDiscussion} 
                            messages={messages}
                            sendMessage={sendMessage}
                            loading={messagesLoading}
                            error={messagesError}
                            onNewConversation={() => setShowNewConversation(true)}
                            onAddParticipant={handleOpenAddParticipant}
                            onLeaveConversation={handleLeaveConversation}
                        />
                    </>
                );

            case VIEWS.CONTACTS:
                return <ContactsView />;

            case VIEWS.PROFILE:
                return (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BBB' }}>
                        Profile View - Coming Soon
                    </div>
                );

            case VIEWS.SETTINGS:
                return <SettingsView />;

            default:
                return null;
        }
    };

    return (
        <>
            <div className="app-container">
                <Sidebar />
                {renderView()}
            </div>

            <AddContactModal
                isOpen={showAddContact}
                onClose={() => setShowAddContact(false)}
            />

            <NewConversationModal
                isOpen={showNewConversation}
                onClose={() => setShowNewConversation(false)}
                onConversationCreated={handleConversationCreated}
            />

            <AddParticipantModal
                isOpen={showAddParticipant}
                onClose={handleParticipantModalClose}
                onSubmit={handleAddParticipant}
                loading={participantLoading}
                error={participantError}
                conversation={participantTarget}
            />
        </>
    );
}

export default AppContainer;
