import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ToastProvider } from './utils.jsx';
import { LoginScreen, RegisterScreen, SeedPhraseScreen, RecoverPasswordScreen } from './auth.jsx';
import { Shell } from './shell.jsx';
import { DashboardOwner, DashboardAdmin, DashboardSuper, DashboardTeacher } from './screens.jsx';
import api from './api.js';

function AuthFlow({ onAuthenticated }) {
  const [screen, setScreen] = useState('login');
  const [seedWords, setSeedWords] = useState([]);

  if (screen === 'register') {
    return (
      <RegisterScreen
        onDone={(words) => { setSeedWords(words); setScreen('seed'); }}
        onBack={() => setScreen('login')}
      />
    );
  }
  if (screen === 'seed') {
    return (
      <SeedPhraseScreen
        seedWords={seedWords}
        onDone={() => onAuthenticated()}
      />
    );
  }
  if (screen === 'recover') {
    return (
      <RecoverPasswordScreen
        onBack={() => setScreen('login')}
        onDone={() => onAuthenticated()}
      />
    );
  }
  return (
    <LoginScreen
      onLogin={() => onAuthenticated()}
      onRegister={() => setScreen('register')}
      onRecover={() => setScreen('recover')}
    />
  );
}

function AppShell({ onLogout }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/me/').then(r => {
      setCurrentUser(r.data);
      setLoading(false);
    }).catch(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      onLogout();
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    onLogout();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
        Загрузка…
      </div>
    );
  }

  const sharedProps = { currentUser, onNavigate: setCurrentScreen, onLogout: handleLogout };

  if (currentScreen === 'dashboard') {
    const role = currentUser.role;
    if (role === 'teacher') return <DashboardTeacher {...sharedProps} />;
    if (role === 'admin')   return <DashboardAdmin   {...sharedProps} />;
    return <DashboardOwner {...sharedProps} />;
  }

  return (
    <Shell currentUser={currentUser} active={currentScreen} onNavigate={setCurrentScreen} onLogout={handleLogout}>
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
        Раздел будет доступен в следующих обновлениях
      </div>
    </Shell>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState(
    () => !!localStorage.getItem('access_token')
  );

  if (!authenticated) {
    return (
      <ToastProvider>
        <AuthFlow onAuthenticated={() => setAuthenticated(true)} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AppShell onLogout={() => setAuthenticated(false)} />
    </ToastProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
