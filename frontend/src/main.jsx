import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ToastProvider } from './utils.jsx';
import { LoginScreen, RegisterScreen, SeedPhraseScreen, RecoverPasswordScreen } from './auth.jsx';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h1>Загрузка приложения...</h1>
      </div>
    </ToastProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
