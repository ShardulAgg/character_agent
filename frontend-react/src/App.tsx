import { useState, FormEvent } from 'react';
import { User, Film, Sparkles, Shield, Loader2 } from 'lucide-react';
import { FirebaseStorageService } from './services/firebase-storage';

function App() {
  const [activeTab, setActiveTab] = useState<'profile' | 'content'>('profile');

  // Form state
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [torsoPhoto, setTorsoPhoto] = useState<File | null>(null);
  const [voiceSample, setVoiceSample] = useState<File | null>(null);
  const [contentOpinion, setContentOpinion] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [guardrails, setGuardrails] = useState('');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!facePhoto || !torsoPhoto || !voiceSample || !contentOpinion.trim() || !speakingStyle.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      // Upload face photo
      setUploadProgress('Uploading face photo...');
      const faceResult = await FirebaseStorageService.uploadFile(
        facePhoto,
        'images/face'
      );

      // Upload torso photo
      setUploadProgress('Uploading torso photo...');
      const torsoResult = await FirebaseStorageService.uploadFile(
        torsoPhoto,
        'images/torso'
      );

      // Upload voice sample
      setUploadProgress('Uploading voice sample...');
      const voiceResult = await FirebaseStorageService.uploadFile(
        voiceSample,
        'voices'
      );

      // Here you would typically save the profile data to your backend
      setUploadProgress('Saving profile...');
      console.log('Profile data:', {
        faceUrl: faceResult.url,
        torsoUrl: torsoResult.url,
        voiceUrl: voiceResult.url,
        contentOpinion,
        speakingStyle,
        guardrails,
      });

      setSuccess(true);
      setUploadProgress('');
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

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
      </div>

      {/* Main Content */}
      <main className="flex-1 ml-64 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
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

            {/* Safety Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Your data is safe and private.</p>
                  <p>We will never use your likeness to create content without your permission.</p>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photos Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Photos</h3>
                  <p className="text-sm text-gray-600">Upload photos for your AI character</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Face Photo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Face Photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFacePhoto(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Close-up headshot, well-lit</p>

                    {facePhoto && (
                      <div className="mt-4">
                        <img
                          src={URL.createObjectURL(facePhoto)}
                          alt="Face preview"
                          className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </div>

                  {/* Torso Photo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Torso Photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setTorsoPhoto(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upper body shot, front-facing</p>

                    {torsoPhoto && (
                      <div className="mt-4">
                        <img
                          src={URL.createObjectURL(torsoPhoto)}
                          alt="Torso preview"
                          className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Voice Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Voice</h3>
                  <p className="text-sm text-gray-600">Upload a voice recording</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Voice Sample
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setVoiceSample(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">10-30 seconds, speaking naturally</p>

                  {voiceSample && (
                    <div className="mt-4">
                      <audio controls className="w-full">
                        <source src={URL.createObjectURL(voiceSample)} type={voiceSample.type} />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                </div>
              </div>

              {/* Content/Opinion Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">What kind of content/opinion do you have</h3>
                </div>
                <textarea
                  rows={5}
                  value={contentOpinion}
                  onChange={(e) => setContentOpinion(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Example: I love creating fitness content and sharing workout tips. I'm passionate about mental health awareness and breaking stigmas..."
                  required
                />
              </div>

              {/* Speaking Style Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Your speaking style</h3>
                </div>

                {/* Sample Writing Styles */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-3">Sample writing styles:</p>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p className="italic">"What's up everyone! Just wanted to drop in and say how much I appreciate you all. Today was crazy productive - hit the gym, meal prepped, and finally finished that project I've been putting off. Who else is crushing their goals this week? Let me know in the comments!"</p>
                    </div>
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p className="italic">"Okay so real talk... why does everyone act like waking up at 5am makes you successful? I tried it and literally turned into a zombie. My productivity peaked at 2pm with a coffee IV drip. Can we normalize finding YOUR rhythm instead of following trends? Just me? Cool."</p>
                    </div>
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p className="italic">"I believe consistency beats perfection every single time. You don't need to have it all figured out today. Small steps, daily progress, and a commitment to showing up - that's what creates real transformation. Keep going, you're closer than you think."</p>
                    </div>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={speakingStyle}
                  onChange={(e) => setSpeakingStyle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Write a few sentences in your natural speaking style..."
                  required
                />
              </div>

              {/* Guardrails Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Guardrails</h3>
                  <p className="text-sm text-gray-600">What should your AI avoid?</p>
                </div>
                <textarea
                  rows={5}
                  value={guardrails}
                  onChange={(e) => setGuardrails(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Example: Never discuss politics. Keep content family-friendly..."
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-600">Profile saved successfully!</p>
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-600">{uploadProgress}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </form>
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

export default App;