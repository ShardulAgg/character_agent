import { ImageProcessor } from './components/ImageProcessor';
import { VoiceProcessor } from './components/VoiceProcessor';
import { SystemStatus } from './components/SystemStatus';
import { UserProfile } from './components/UserProfile';
import { AuthComponent } from './components/AuthComponent';
import { AuthProvider } from './contexts/AuthContext';
import { Wand2 } from 'lucide-react';
import { useState, useEffect } from 'react';

function App() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // Listen for email changes from child components
  useEffect(() => {
    const handleEmailUpdate = (event: CustomEvent) => {
      setCurrentUserEmail(event.detail.email);
    };

    window.addEventListener('userEmailUpdated', handleEmailUpdate as EventListener);
    return () => {
      window.removeEventListener('userEmailUpdated', handleEmailUpdate as EventListener);
    };
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wand2 className="h-8 w-8 text-primary-600 mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">TikTok Genie</h1>
                  <p className="text-gray-600 mt-1">AI-powered Reel Generator</p>
                </div>
              </div>
              <AuthComponent />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <ImageProcessor onEmailUpdate={(email) => setCurrentUserEmail(email)} />
            <VoiceProcessor onEmailUpdate={(email) => setCurrentUserEmail(email)} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {currentUserEmail && (
              <UserProfile userEmail={currentUserEmail} />
            )}
            <SystemStatus />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-gray-500 text-sm">
              Built with React + TypeScript + Vite • FastAPI Backend • Deployed on Google Cloud Platform
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}

export default App;