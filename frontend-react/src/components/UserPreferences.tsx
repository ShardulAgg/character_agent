import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { FirestoreService } from '../services/firestore';
import { Shield, MessageSquare, FileText, Loader2, Database } from 'lucide-react';

interface UserPreferencesProps {
  userEmail: string;
  className?: string;
}

export const UserPreferences: React.FC<UserPreferencesProps> = ({ userEmail, className = '' }) => {
  const [contentOpinion, setContentOpinion] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [guardrails, setGuardrails] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  // Load existing preferences
  const loadPreferences = async () => {
    if (!userEmail) return;

    setLoading(true);
    setError('');

    try {
      const user = await FirestoreService.getEmailUser(userEmail);
      if (user) {
        setContentOpinion(user.contentOpinion || '');
        setSpeakingStyle(user.speakingStyle || '');
        setGuardrails(user.guardrails || '');
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, [userEmail]);

  const handleSave = async () => {
    if (!userEmail) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await FirestoreService.updateEmailUserPreferences(userEmail, {
        contentOpinion,
        speakingStyle,
        guardrails,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save preferences. Please try again.');
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!userEmail) return null;

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm ${className}`}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-gray-900" />
          <h2 className="text-lg font-bold text-gray-900">Your Profile</h2>
          <Database className="h-4 w-4 text-green-500 ml-auto" />
        </div>
        <p className="text-sm text-gray-600">
          Define your content style and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Content Opinion */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-gray-700" />
            <label className="block text-sm font-medium text-gray-900">
              What kind of content/opinion do you have
            </label>
          </div>
          <textarea
            rows={5}
            value={contentOpinion}
            onChange={(e) => setContentOpinion(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            placeholder="Example: I love creating fitness content and sharing workout tips. I'm passionate about mental health awareness and breaking stigmas..."
          />
        </div>

        {/* Speaking Style */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-700" />
            <label className="block text-sm font-medium text-gray-900">
              Your speaking style
            </label>
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
          />
        </div>

        {/* Guardrails */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-gray-700" />
            <label className="block text-sm font-medium text-gray-900">
              Guardrails
            </label>
          </div>
          <p className="text-xs text-gray-600 mb-2">What should your AI avoid?</p>
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
            <p className="text-sm text-green-600">Preferences saved successfully!</p>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  );
};
