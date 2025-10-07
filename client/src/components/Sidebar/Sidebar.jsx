import './Sidebar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faComments,
    faUserCircle,
    faAddressBook,
    faCog,
    faSignOutAlt,
    faDownload
} from '@fortawesome/free-solid-svg-icons';
import { useAuthContext } from '../../context/AuthContext';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { useViewContext, VIEWS } from '../../context/ViewContext';
import { useNotifications } from '../../hooks/useNotifications';

function Sidebar() {
    const { user, logout } = useAuthContext();
    const { disconnect, isConnected } = useWebSocketContext();
    const { currentView, setCurrentView } = useViewContext();
    const { unreadCount } = useNotifications();

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            disconnect();
            logout();
        }
    };

    const navItems = [
        { id: VIEWS.MESSAGES, icon: faComments, label: 'Messages', badge: unreadCount },
        { id: VIEWS.CONTACTS, icon: faAddressBook, label: 'Contacts' },
        { id: VIEWS.PROFILE, icon: faUserCircle, label: 'Profile' },
        { id: VIEWS.SETTINGS, icon: faCog, label: 'Settings' }
    ];

    return (
        <nav className="sidebar">
            {/* User Profile Section */}
            <div className="sidebar-profile">
                <div className="sidebar-avatar">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className={`sidebar-status ${isConnected ? 'online' : 'offline'}`}></div>
            </div>

            {/* Navigation Items */}
            <ul className="sidebar-items">
                {navItems.map(item => (
                    <li
                        key={item.id}
                        className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => setCurrentView(item.id)}
                        title={item.label}
                    >
                        <FontAwesomeIcon icon={item.icon} />
                        {item.badge > 0 && (
                            <span className="sidebar-badge">{item.badge > 9 ? '9+' : item.badge}</span>
                        )}
                    </li>
                ))}
            </ul>

            {/* Logout Button */}
            <div className="sidebar-footer">
                <div
                    className="sidebar-item logout-item"
                    onClick={handleLogout}
                    title="Logout"
                >
                    <FontAwesomeIcon icon={faSignOutAlt} />
                </div>
                <div className="sidebar-username">{user?.username}</div>
            </div>
        </nav>
    );
}

export default Sidebar;