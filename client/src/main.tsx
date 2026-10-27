import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const app = (
  <AuthProvider>
    <SocketProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </SocketProvider>
  </AuthProvider>
);

createRoot(document.getElementById("root")!).render(
  clientId ? (
    <GoogleOAuthProvider clientId={clientId}>
      {app}
    </GoogleOAuthProvider>
  ) : (
    app
  )
);
