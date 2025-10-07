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

function AppContainer() {
    const [activeDiscussion, setActiveDiscussion] = useState(null);
    const [showAddContact, setShowAddContact] = useState(false);
    const [showNewConversation, setShowNewConversation] = useState(false);
    const { currentView } = useViewContext();
    const { currentSession } = useAuth();
    
    // Get messages context
    const { getMessages, loadMessages, sendMessage, loading: messagesLoading, error: messagesError } = useMessages();
    
    // Get messages for the active discussion
    const messages = activeDiscussion ? getMessages(activeDiscussion.id) : [];

    // Load messages when conversation is selected
    useEffect(() => {
        if (activeDiscussion?.id) {
            loadMessages(activeDiscussion.id);
        }
    }, [activeDiscussion?.id]);

    // Reset active discussion when user logs out
    useEffect(() => {
        if (!currentSession) {
            setActiveDiscussion(null);
            setShowAddContact(false);
            setShowNewConversation(false);
        }
    }, [currentSession]);

    // Handle new conversation created
    const handleConversationCreated = (conversation) => {
        // Automatically select the newly created conversation
        setActiveDiscussion(conversation);
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
        </>
    );
}

export default AppContainer;