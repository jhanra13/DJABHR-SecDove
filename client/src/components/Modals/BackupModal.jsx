import { useState } from 'react';
import './BackupModal.css';
import { createBackup, restoreBackup, exportBackupToFile, importBackupFromFile, getBackupInfo } from '../../utils/messageBackup';
import { getStorageStats, clearAllMessagesForUser } from '../../utils/messageStorage';

function BackupModal({ isOpen, onClose, userId }) {
    const [activeTab, setActiveTab] = useState('backup'); // 'backup' or 'restore'
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [stats, setStats] = useState(null);
    const [backupFile, setBackupFile] = useState(null);
    const [backupInfo, setBackupInfo] = useState(null);

    // Load storage stats when modal opens
    useState(() => {
        if (isOpen && userId) {
            loadStats();
        }
    }, [isOpen, userId]);

    const loadStats = async () => {
        try {
            const storageStats = await getStorageStats(userId);
            setStats(storageStats);
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const handleBackup = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate PIN
        if (pin.length < 4) {
            setError('PIN must be at least 4 characters');
            return;
        }

        if (pin !== confirmPin) {
            setError('PINs do not match');
            return;
        }

        setLoading(true);

        try {
            // Create encrypted backup
            const backupPackage = await createBackup(userId, pin);

            // Export to file
            const exported = exportBackupToFile(backupPackage, userId);

            if (exported) {
                setSuccess(`Backup created successfully! ${backupPackage.messageCount} messages backed up.`);
                setPin('');
                setConfirmPin('');
            } else {
                setError('Failed to export backup file');
            }
        } catch (err) {
            console.error('Backup failed:', err);
            setError(err.message || 'Failed to create backup');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError('');
        setSuccess('');
        setBackupInfo(null);

        try {
            const backupPackage = await importBackupFromFile(file);
            setBackupFile(backupPackage);
            
            // Show backup info
            const info = getBackupInfo(backupPackage);
            setBackupInfo(info);
            
            setSuccess('Backup file loaded successfully');
        } catch (err) {
            console.error('Failed to load backup file:', err);
            setError(err.message || 'Failed to load backup file');
        }
    };

    const handleRestore = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!backupFile) {
            setError('Please select a backup file first');
            return;
        }

        if (!pin) {
            setError('Please enter your backup PIN');
            return;
        }

        // Confirm restore
        if (!window.confirm('This will add backed up messages to your current messages. Continue?')) {
            return;
        }

        setLoading(true);

        try {
            const result = await restoreBackup(backupFile, pin, userId);

            if (result.success) {
                setSuccess(`Restored ${result.restoredCount} messages successfully!`);
                setPin('');
                setBackupFile(null);
                setBackupInfo(null);
                
                // Reload stats
                await loadStats();

                // Notify parent to refresh messages
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setError('Failed to restore messages');
            }
        } catch (err) {
            console.error('Restore failed:', err);
            setError(err.message || 'Failed to restore backup - check your PIN');
        } finally {
            setLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('⚠️ This will permanently delete ALL your sent messages from this browser. This cannot be undone! Continue?')) {
            return;
        }

        if (!window.confirm('Are you absolutely sure? Make sure you have a backup first!')) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const deletedCount = await clearAllMessagesForUser(userId);
            setSuccess(`Deleted ${deletedCount} messages`);
            await loadStats();
        } catch (err) {
            console.error('Failed to clear messages:', err);
            setError('Failed to clear messages');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content backup-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>💾 Message Backup & Restore</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="backup-tabs">
                    <button
                        className={`tab-button ${activeTab === 'backup' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('backup');
                            setError('');
                            setSuccess('');
                        }}
                    >
                        📤 Backup
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'restore' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('restore');
                            setError('');
                            setSuccess('');
                        }}
                    >
                        📥 Restore
                    </button>
                </div>

                {stats && (
                    <div className="storage-stats">
                        <h3>📊 Storage Statistics</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Total Messages:</span>
                                <span className="stat-value">{stats.totalMessages}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Storage Used:</span>
                                <span className="stat-value">{(stats.estimatedSize / 1024).toFixed(2)} KB</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="modal-body">
                    {activeTab === 'backup' ? (
                        <div className="backup-section">
                            <div className="info-box">
                                <p>🔐 Create an encrypted backup of all your sent messages.</p>
                                <p>Use a PIN to protect your backup. You'll need this PIN to restore your messages later.</p>
                            </div>

                            <form onSubmit={handleBackup}>
                                <div className="form-group">
                                    <label>Backup PIN (min 4 characters)</label>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        placeholder="Enter a PIN"
                                        minLength="4"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Confirm PIN</label>
                                    <input
                                        type="password"
                                        value={confirmPin}
                                        onChange={(e) => setConfirmPin(e.target.value)}
                                        placeholder="Re-enter PIN"
                                        minLength="4"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                {error && <div className="error-message">{error}</div>}
                                {success && <div className="success-message">{success}</div>}

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading || !pin || !confirmPin}
                                >
                                    {loading ? '⏳ Creating Backup...' : '📤 Create Backup'}
                                </button>
                            </form>

                            <div className="danger-zone">
                                <h4>⚠️ Danger Zone</h4>
                                <button
                                    className="btn-danger"
                                    onClick={handleClearAll}
                                    disabled={loading}
                                >
                                    🗑️ Clear All Messages
                                </button>
                                <p className="warning-text">
                                    This will permanently delete all sent messages from this browser. Make sure you have a backup first!
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="restore-section">
                            <div className="info-box">
                                <p>📥 Restore your messages from a backup file.</p>
                                <p>Select your backup file and enter the PIN you used when creating the backup.</p>
                            </div>

                            <form onSubmit={handleRestore}>
                                <div className="form-group">
                                    <label>Select Backup File</label>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileSelect}
                                        disabled={loading}
                                    />
                                </div>

                                {backupInfo && (
                                    <div className="backup-info">
                                        <h4>📋 Backup Information</h4>
                                        <div className="info-grid">
                                            <div><strong>User ID:</strong> {backupInfo.userId}</div>
                                            <div><strong>Created:</strong> {new Date(backupInfo.createdAt).toLocaleString()}</div>
                                            <div><strong>Messages:</strong> {backupInfo.messageCount}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Backup PIN</label>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        placeholder="Enter your backup PIN"
                                        required
                                        disabled={loading || !backupFile}
                                    />
                                </div>

                                {error && <div className="error-message">{error}</div>}
                                {success && <div className="success-message">{success}</div>}

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loading || !backupFile || !pin}
                                >
                                    {loading ? '⏳ Restoring...' : '📥 Restore Backup'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BackupModal;
