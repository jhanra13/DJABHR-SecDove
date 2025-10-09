import { useState } from 'react';
import './SettingsView.css';
import BackupModal from '../Modals/BackupModal';
import { useAuth } from '../../context/AuthContext';
import { getStorageInfo } from '../../utils/messageStorage';

function SettingsView() {
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [stats, setStats] = useState(null);
    const { currentSession, user } = useAuth();

    const loadStats = async () => {
        if (currentSession) {
            const storageStats = await getStorageInfo();
            setStats(storageStats);
        }
    };

    // Load stats when component mounts
    useState(() => {
        loadStats();
    }, [currentSession]);

    // Add a debug log to confirm rendering
    console.log('SettingsView component rendered');

    // Add a visible placeholder to confirm rendering
    return (
        <div className="settings-view">
            <h1>⚙️ Settings</h1>
            <p>Settings page is under construction.</p>
            <div className="settings-container">
                <h1>⚙️ Settings</h1>

                <section className="settings-section">
                    <h2>👤 Account</h2>
                    <div className="settings-item">
                        <div className="settings-item-info">
                            <strong>Username</strong>
                            <p>{user?.username || 'Guest'}</p>
                        </div>
                    </div>
                    <div className="settings-item">
                        <div className="settings-item-info">
                            <strong>User ID</strong>
                            <p>{user?.id || 'N/A'}</p>
                        </div>
                    </div>
                </section>

                <section className="settings-section">
                    <h2>💾 Message Backup</h2>
                    <div className="settings-item">
                        <div className="settings-item-info">
                            <strong>Backup & Restore Messages</strong>
                            <p>Create encrypted backups of your sent messages with a PIN. You can restore them later on any device or after clearing browser data.</p>
                        </div>
                        <button 
                            className="btn-primary"
                            onClick={() => setShowBackupModal(true)}
                        >
                            Manage Backups
                        </button>
                    </div>
                    
                    {stats && (
                        <div className="settings-item">
                            <div className="settings-item-info">
                                <strong>Local Storage</strong>
                                <div className="storage-info">
                                    <p>📨 {stats.totalMessages} sent messages stored</p>
                                    <p>💾 {(stats.estimatedSize / 1024).toFixed(2)} KB used</p>
                                </div>
                            </div>
                            <button 
                                className="btn-secondary"
                                onClick={loadStats}
                            >
                                Refresh Stats
                            </button>
                        </div>
                    )}
                </section>

                <section className="settings-section">
                    <h2>🔒 Security</h2>
                    <div className="settings-item">
                        <div className="settings-item-info">
                            <strong>End-to-End Encryption</strong>
                            <p>All messages are encrypted using RSA-OAEP + AES-GCM hybrid encryption. Your private keys are stored locally in your browser.</p>
                        </div>
                    </div>
                    <div className="settings-item">
                        <div className="settings-item-info">
                            <strong>Local Storage</strong>
                            <p>Sent messages are stored locally using IndexedDB. They will be deleted if you clear your browser data unless you create a backup.</p>
                        </div>
                    </div>
                </section>

                <section className="settings-section">
                    <h2>ℹ️ About</h2>
                    <div className="settings-item">
                        <div className="settings-item-info">
                            <strong>SecDove</strong>
                            <p>A secure end-to-end encrypted messaging application</p>
                            <p className="version">Version 1.0.0</p>
                        </div>
                    </div>
                </section>
            </div>

            <BackupModal 
                isOpen={showBackupModal}
                onClose={() => setShowBackupModal(false)}
                userId={user?.id}
            />
        </div>
    );
}

export default SettingsView;
