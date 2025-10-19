import React, { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from './Button';
import { FirebaseStorageService } from '../services/firebase-storage';
import { FirestoreService } from '../services/firestore';
import { Image as ImageIcon, Music, Shield, MessageSquare, FileText, Loader2, CheckCircle } from 'lucide-react';

interface ProfileFormProps {
  userEmail: string;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ userEmail }) => {
  // File states
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [torsoPhoto, setTorsoPhoto] = useState<File | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);

  // Existing data from Firestore
  const [existingFaceUrl, setExistingFaceUrl] = useState<string>('');
  const [existingTorsoUrl, setExistingTorsoUrl] = useState<string>('');
  const [existingVoiceUrl, setExistingVoiceUrl] = useState<string>('');

  // Text fields
  const [contentOpinion, setContentOpinion] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [guardrails, setGuardrails] = useState('');

  // Upload state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const imageAccept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] };
  const audioAccept = { 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.aac'] };

  // Load existing profile
  useEffect(() => {
    loadProfile();
  }, [userEmail]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const user = await FirestoreService.getEmailUser(userEmail);
      if (user) {
        // Load text preferences
        setContentOpinion(user.contentOpinion || '');
        setSpeakingStyle(user.speakingStyle || '');
        setGuardrails(user.guardrails || '');

        // Load images
        if (user.imageIds && user.imageIds.length > 0) {
          for (const imageId of user.imageIds) {
            const imageData = await FirestoreService.getImageMetadata(imageId);
            if (imageData) {
              if (imageData.imageType === 'face') {
                setExistingFaceUrl(imageData.downloadUrl);
              } else if (imageData.imageType === 'torso') {
                setExistingTorsoUrl(imageData.downloadUrl);
              }
            }
          }
        }

        // Load voice
        if (user.voiceIds && user.voiceIds.length > 0) {
          const voiceData = await FirestoreService.getVoiceMetadata(user.voiceIds[0]);
          if (voiceData) {
            setExistingVoiceUrl(voiceData.downloadUrl);
          }
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!facePhoto && !torsoPhoto && !voiceFile && !contentOpinion && !speakingStyle && !guardrails) {
      setError('Please fill in at least one field');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);
    setProgress('');

    try {
      const userId = userEmail.replace(/[@.]/g, '_');

      // Create/update user first to ensure document exists
      await FirestoreService.createOrUpdateEmailUser(userEmail);

      // Get existing user data to check for old images
      const existingUser = await FirestoreService.getEmailUser(userEmail);

      // Upload face photo (replace if exists)
      if (facePhoto) {
        setProgress('Uploading face photo...');

        // Delete old face photo if exists
        if (existingUser?.imageIds) {
          for (const imageId of existingUser.imageIds) {
            const oldImage = await FirestoreService.getImageMetadata(imageId);
            if (oldImage?.imageType === 'face') {
              await FirestoreService.deleteImage(imageId);
              // Remove from user's imageIds array
              const updatedImageIds = existingUser.imageIds.filter(id => id !== imageId);
              await FirestoreService.updateEmailUser(userEmail, { imageIds: updatedImageIds });
            }
          }
        }

        const faceResult = await FirebaseStorageService.uploadFile(
          facePhoto,
          'images',
          () => {}
        );

        const faceData = {
          type: 'image' as const,
          userId,
          userEmail,
          fileName: faceResult.name,
          originalName: facePhoto.name,
          storagePath: faceResult.path,
          downloadUrl: faceResult.url,
          fileSize: facePhoto.size,
          mimeType: facePhoto.type,
          processingStatus: 'pending' as const,
          variations: [],
          imageType: 'face' as const,
        };

        const faceId = await FirestoreService.createImageMetadata(faceData);
        await FirestoreService.addImageToUser(userEmail, faceId);
      }

      // Upload torso photo (replace if exists)
      if (torsoPhoto) {
        setProgress('Uploading torso photo...');

        // Delete old torso photo if exists
        if (existingUser?.imageIds) {
          for (const imageId of existingUser.imageIds) {
            const oldImage = await FirestoreService.getImageMetadata(imageId);
            if (oldImage?.imageType === 'torso') {
              await FirestoreService.deleteImage(imageId);
              // Remove from user's imageIds array
              const updatedImageIds = existingUser.imageIds.filter(id => id !== imageId);
              await FirestoreService.updateEmailUser(userEmail, { imageIds: updatedImageIds });
            }
          }
        }

        const torsoResult = await FirebaseStorageService.uploadFile(
          torsoPhoto,
          'images',
          () => {}
        );

        const torsoData = {
          type: 'image' as const,
          userId,
          userEmail,
          fileName: torsoResult.name,
          originalName: torsoPhoto.name,
          storagePath: torsoResult.path,
          downloadUrl: torsoResult.url,
          fileSize: torsoPhoto.size,
          mimeType: torsoPhoto.type,
          processingStatus: 'pending' as const,
          variations: [],
          imageType: 'torso' as const,
        };

        const torsoId = await FirestoreService.createImageMetadata(torsoData);
        await FirestoreService.addImageToUser(userEmail, torsoId);
      }

      // Upload voice (replace if exists)
      if (voiceFile) {
        setProgress('Uploading voice file...');

        // Delete old voice file if exists
        if (existingUser?.voiceIds && existingUser.voiceIds.length > 0) {
          for (const voiceId of existingUser.voiceIds) {
            await FirestoreService.deleteVoice(voiceId);
          }
          // Clear all voice IDs from user
          await FirestoreService.updateEmailUser(userEmail, { voiceIds: [] });
        }

        const voiceResult = await FirebaseStorageService.uploadFile(
          voiceFile,
          'voices',
          () => {}
        );

        const voiceData = {
          type: 'voice' as const,
          userId,
          userEmail,
          fileName: voiceResult.name,
          originalName: voiceFile.name,
          storagePath: voiceResult.path,
          downloadUrl: voiceResult.url,
          fileSize: voiceFile.size,
          mimeType: voiceFile.type,
          processingStatus: 'pending' as const,
        };

        const voiceId = await FirestoreService.createVoiceMetadata(voiceData);
        await FirestoreService.addVoiceToUser(userEmail, voiceId);
      }

      // Save text preferences
      if (contentOpinion || speakingStyle || guardrails) {
        setProgress('Saving preferences...');
        await FirestoreService.updateEmailUserPreferences(userEmail, {
          contentOpinion,
          speakingStyle,
          guardrails,
        });
      }

      setProgress('');
      setSuccess(true);

      // Clear files after successful save
      setFacePhoto(null);
      setTorsoPhoto(null);
      setVoiceFile(null);

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error('Save error:', err);
      setProgress('');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Loader2 className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Media Upload Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Photos */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Photos</h2>
              <p className="text-xs text-gray-500">Upload face and torso photos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Face Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Face Photo
              </label>
              {existingFaceUrl && !facePhoto && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <p className="text-xs font-medium text-emerald-800">Uploaded</p>
                  </div>
                  <img src={existingFaceUrl} alt="Face" className="w-full h-28 object-cover rounded-md" />
                </div>
              )}
              <FileUpload
                accept={imageAccept}
                onFileSelect={setFacePhoto}
                selectedFile={facePhoto}
                type="image"
                maxSize={10 * 1024 * 1024}
              />
            </div>

            {/* Torso Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Torso Photo
              </label>
              {existingTorsoUrl && !torsoPhoto && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <p className="text-xs font-medium text-emerald-800">Uploaded</p>
                  </div>
                  <img src={existingTorsoUrl} alt="Torso" className="w-full h-28 object-cover rounded-md" />
                </div>
              )}
              <FileUpload
                accept={imageAccept}
                onFileSelect={setTorsoPhoto}
                selectedFile={torsoPhoto}
                type="image"
                maxSize={10 * 1024 * 1024}
              />
            </div>
          </div>
        </div>

        {/* Voice */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Music className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Voice Recording</h2>
              <p className="text-xs text-gray-500">Record yourself reading the text below</p>
            </div>
          </div>

          {/* Voice Recording Instructions */}
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-900 mb-3">📖 Please read this text clearly:</p>
            <div className="text-sm text-gray-700 leading-relaxed space-y-2 italic">
              <p>The lighthouse keeper checked his clock. It was 3:00 AM, and a bad storm was starting. He climbed the iron stairs to the top. The light beam seemed weak against the heavy darkness.</p>
              <p>He saw the glass was covered in sea-salt. It wasn't the bulb that was failing, but the pane itself. The keeper took a rag and quickly wiped the glass clean.</p>
              <p>The light instantly grew bright, cutting a sharp line through the rain. The storm did not look so scary now. He started to go back down.</p>
              <p>When he reached the bottom floor, the heavy iron door was open. Through the noise of the rain, he clearly heard footsteps walking away from the tower, toward the dangerous sea. He realized he had not been alone.</p>
            </div>
          </div>

          {existingVoiceUrl && !voiceFile && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-xs font-medium text-emerald-800">Uploaded</p>
              </div>
              <audio controls className="w-full h-8">
                <source src={existingVoiceUrl} />
              </audio>
            </div>
          )}

          <FileUpload
            accept={audioAccept}
            onFileSelect={setVoiceFile}
            selectedFile={voiceFile}
            type="audio"
            maxSize={50 * 1024 * 1024}
          />
        </div>
      </div>

      {/* Personality & Style Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Personality & Style</h2>
            <p className="text-xs text-gray-500">Define your content style and preferences</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Content Opinion */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-gray-600" />
              Content & Opinions
            </label>
            <textarea
              rows={3}
              value={contentOpinion}
              onChange={(e) => setContentOpinion(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              placeholder="What topics do you create content about? What are your opinions and perspectives?"
            />
          </div>

          {/* Speaking Style */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
              <FileText className="h-3.5 w-3.5 text-gray-600" />
              Speaking Style
            </label>
            <textarea
              rows={3}
              value={speakingStyle}
              onChange={(e) => setSpeakingStyle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              placeholder="Write a few sentences in your natural speaking style..."
            />
          </div>

          {/* Guardrails */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
              <Shield className="h-3.5 w-3.5 text-gray-600" />
              Content Guardrails
            </label>
            <textarea
              rows={3}
              value={guardrails}
              onChange={(e) => setGuardrails(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              placeholder="What topics or language should your AI avoid?"
            />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {(progress || error || success) && (
        <div className="space-y-3">
          {/* Progress */}
          {progress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5">
              <div className="flex items-center">
                <Loader2 className="animate-spin h-4 w-4 text-blue-600 mr-2.5" />
                <p className="text-sm font-medium text-blue-800">{progress}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3.5">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-emerald-600 mr-2.5" />
                <p className="text-sm font-medium text-emerald-700">Profile saved successfully!</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSaveProfile}
        loading={saving}
        disabled={saving}
        className="w-full py-3.5 text-sm font-semibold"
      >
        {saving ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Saving Profile...
          </>
        ) : (
          'Save Profile'
        )}
      </Button>
    </div>
  );
};
