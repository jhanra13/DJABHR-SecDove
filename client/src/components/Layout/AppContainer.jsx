import { useState, useEffect } from 'react';
import './AppContainer.css';
import Sidebar from '../Sidebar/Sidebar';
import DiscussionsList from '../Discussions/DiscussionsList';
import ChatWindow from '../Chat/ChatWindow';
import ContactsView from '../Contacts/ContactsView';
import SettingsView from '../Settings/SettingsView';
import AddContactModal from '../Modals/AddContactModal';
import { useViewContext, VIEWS } from '../../context/ViewContext';
import { useAuthContext } from '../../context/AuthContext';
import { useMessages } from '../../hooks/useMessages';

function AppContainer() {
    const [activeDiscussion, setActiveDiscussion] = useState(null);
    const [showAddContact, setShowAddContact] = useState(false);
    const { currentView } = useViewContext();
    const { user } = useAuthContext();
    
    // Only call useMessages when we have a valid active discussion
    const activeContactId = activeDiscussion?.id || null;
    const { messages, sendMessage, loading: messagesLoading, error: messagesError } = useMessages(activeContactId);

    // Reset active discussion when user logs out
    useEffect(() => {
        if (!user) {
            setActiveDiscussion(null);
            setShowAddContact(false);
        }
    }, [user]);

    const renderView = () => {
        switch(currentView) {
            case VIEWS.MESSAGES:
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
        </>
    );
}

export default AppContainer;