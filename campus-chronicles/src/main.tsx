import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { ClerkProvider } from '@clerk/clerk-react'; // Import ClerkProvider
import LoginPage from './LoginPage.tsx'; // Import your new initial page component
import Profile from './Profile.tsx'; // Ensure this import is correct

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey="pk_test_c3VyZS10ZXJtaXRlLTUwLmNsZXJrLmFjY291bnRzLmRldiQ"> {/* Replace with your Clerk frontend API */}
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} /> {/* Set LoginPage as the initial route */}
          <Route path="/app" element={<App />} /> {/* Route to App.tsx */}
          <Route path="/profile" element={<Profile />} /> {/* Ensure this route is correct */}
        </Routes>
      </Router>
    </ClerkProvider>
  </StrictMode>,
);