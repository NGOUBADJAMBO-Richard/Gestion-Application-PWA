import { RouterProvider } from 'react-router';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { PwaStatus } from './components/PwaStatus';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
          <PwaStatus />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
