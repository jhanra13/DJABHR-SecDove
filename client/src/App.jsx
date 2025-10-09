import { useState, useEffect } from 'react';
import './App.css';
import AppContainer from './components/Layout/AppContainer';
import LoginModal from './components/Modals/LoginModal';
import RegistrationModal from './components/Modals/RegistrationModal';
import { useAuth } from './context/AuthContext';

console.log('📱 App.jsx: Component loaded');

function App() {
    console.log('🎯 App: Rendering...');
    const [showLogin, setShowLogin] = useState(true);
    const [showRegistration, setShowRegistration] = useState(false);
    
    try {
        const { currentSession } = useAuth();
        console.log('👤 App: Current session:', currentSession ? 'Logged in' : 'Not logged in');

        // Hide modals when user is authenticated
        useEffect(() => {
            console.log('🔄 App: Session changed, updating modals...');
            if (currentSession) {
                setShowLogin(false);
                setShowRegistration(false);
            } else {
                setShowLogin(true);
            }
        }, [currentSession]);

        const handleSwitchToRegister = () => {
            console.log('🔀 App: Switching to registration');
            setShowLogin(false);
            setShowRegistration(true);
        };

        const handleSwitchToLogin = () => {
            console.log('🔀 App: Switching to login');
            setShowRegistration(false);
            setShowLogin(true);
        };

        console.log('🎨 App: Rendering UI, showLogin:', showLogin, 'showRegistration:', showRegistration);
        
        return (
            <div className="app-wrapper">
                <AppContainer />

                {!currentSession && (
                    <>
                        <LoginModal
                            isOpen={showLogin}
                            onClose={() => setShowLogin(false)}
                            onSwitchToRegister={handleSwitchToRegister}
                        />

                        <RegistrationModal
                            isOpen={showRegistration}
                            onClose={() => setShowRegistration(false)}
                            onSwitchToLogin={handleSwitchToLogin}
                        />
                    </>
                )}
            </div>
        );
    } catch (error) {
        console.error('❌ App: Error during render:', error);
        return (
            <div style={{ padding: '20px', fontFamily: 'monospace' }}>
                <h1 style={{ color: 'red' }}>App Error</h1>
                <p><strong>Failed to render application:</strong></p>
                <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                </pre>
            </div>
        );
    }
}

export default App;