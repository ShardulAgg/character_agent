import { ImageProcessor } from './components/ImageProcessor';
import { VoiceProcessor } from './components/VoiceProcessor';
import { SystemStatus } from './components/SystemStatus';
import { Wand2 } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Wand2 className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TikTok Genie</h1>
              <p className="text-gray-600 mt-1">AI-powered Reel Generator</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ImageProcessor />
          <VoiceProcessor />
        </div>
        
        <SystemStatus />
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
  );
}

export default App;