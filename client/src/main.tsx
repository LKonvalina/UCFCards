import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { AppProvider } from './state/AppContext';
import './styles.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to client/.env');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
    <AppProvider>
      <App />
    </AppProvider>
  </ClerkProvider>,
);
