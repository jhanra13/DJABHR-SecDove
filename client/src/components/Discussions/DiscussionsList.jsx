import { useState, useMemo } from 'react';
import './DiscussionsList.css';
import SearchBar from './SearchBar';
import DiscussionItem from './DiscussionItem';
import { useConversations } from '../../hooks/useConversations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons';

export default function DiscussionsList({ activeDiscussion, onDiscussionSelect, onAddContact }) {
    const [searchQuery, setSearchQuery] = useState('');
    const { conversations, loading } = useConversations();

    const filteredDiscussions = useMemo(() => {
        return conversations.filter((discussion) =>
            discussion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            discussion.message.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, conversations]);

    return (
        <section className="discussions">
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                borderBottom: '1px solid #E0E0E0',
                backgroundColor: '#FAFAFA'
            }}>
                <SearchBar onSearch={setSearchQuery} />
                <button
                    onClick={onAddContact}
                    style={{
                        marginLeft: '10px',
                        background: 'linear-gradient(to right, #4768b5, #35488e)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Add Contact"
                >
                    <FontAwesomeIcon icon={faUserPlus} />
                </button>
            </div>
            {loading ? (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#BBB',
                    marginTop: '20px'
                }}>
                    Loading conversations...
                </div>
            ) : filteredDiscussions.length === 0 ? (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#BBB',
                    marginTop: '20px'
                }}>
                    {searchQuery ? 'No conversations found' : 'No contacts yet. Click + to add contacts.'}
                </div>
            ) : (
                filteredDiscussions.map((discussion) => (
                    <DiscussionItem
                        key={discussion.id}
                        {...discussion}
                        isActive={activeDiscussion?.id === discussion.id}
                        onClick={() => onDiscussionSelect(discussion)}
                    />
                ))
            )}
        </section>
    );
}