import { useState, useEffect } from 'react';
import './App.css';
import AppContainer from './components/Layout/AppContainer';
import LoginModal from './components/Modals/LoginModal';
import RegistrationModal from './components/Modals/RegistrationModal';
import { useAuthContext } from './context/AuthContext';

function App() {
    const [showLogin, setShowLogin] = useState(true);
    const [showRegistration, setShowRegistration] = useState(false);
    const { user } = useAuthContext();

    // Hide modals when user is authenticated
    useEffect(() => {
        if (user) {
            setShowLogin(false);
            setShowRegistration(false);
        } else {
            setShowLogin(true);
        }
    }, [user]);

    const handleSwitchToRegister = () => {
        setShowLogin(false);
        setShowRegistration(true);
    };

    const handleSwitchToLogin = () => {
        setShowRegistration(false);
        setShowLogin(true);
    };

    return (
        <div className="app-wrapper">
            <AppContainer />

            {!user && (
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
}

export default App;