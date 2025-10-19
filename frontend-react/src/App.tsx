import { useState, useEffect } from 'react';
import { User, Film, Sparkles } from 'lucide-react';
import { ProfileForm } from './components/ProfileForm';
import { AuthComponent } from './components/AuthComponent';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'content'>('profile');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // Set email from authenticated user
  useEffect(() => {
    if (currentUser?.email) {
      setCurrentUserEmail(currentUser.email);
    }
  }, [currentUser]);

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

  // Show login screen if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-lg text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Cloutfarm</h1>
            <p className="text-gray-600 mb-8">
              Create your AI character with photos, voice, and personality
            </p>
            <AuthComponent />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-screen">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Cloutfarm</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-2 ${
                activeTab === 'profile'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <User className="h-5 w-5" />
              Profile Setup
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'content'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Film className="h-5 w-5" />
              Content
            </button>
          </nav>

          {/* Auth Component in Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <AuthComponent />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 ml-64 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {activeTab === 'profile' ? (
              <div>
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Profile Setup
                  </h2>
                  <p className="text-gray-600">
                    Create your AI character with photos, voice, and personality
                  </p>
                </div>

                {/* Single Profile Form */}
                {currentUserEmail && (
                  <ProfileForm userEmail={currentUserEmail} />
                )}
              </div>
            ) : (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Content Studio
                  </h2>
                  <p className="text-gray-600">
                    Create and manage your AI-generated content
                  </p>
                </div>
                <div className="bg-white rounded-xl p-16 text-center border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Film className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Complete your profile setup to start creating content
                  </p>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    Set Up Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
