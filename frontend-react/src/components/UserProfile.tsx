import React, { useState, useEffect } from 'react';
import { FirestoreService } from '../services/firestore';
import { EmailUser } from '../types/firestore';
import { User, Image, Music, FolderOpen, Clock, Mail } from 'lucide-react';

interface UserProfileProps {
  userEmail: string;
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userEmail, className = '' }) => {
  const [user, setUser] = useState<EmailUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadUser = async () => {
    if (!userEmail) return;
    
    setLoading(true);
    setError('');
    
    try {
      const userData = await FirestoreService.getEmailUser(userEmail);
      setUser(userData);
    } catch (err) {
      setError('Failed to load user data');
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [userEmail]);

  if (!userEmail) return null;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-gray-500 text-sm">User not found</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <User className="h-6 w-6 text-primary-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
      </div>

      <div className="space-y-4">
        {/* User Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </div>
            <div className="text-sm text-gray-600 font-mono">{user.email}</div>
          </div>
          
          {user.displayName && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Display Name</div>
              <div className="text-sm text-gray-600">{user.displayName}</div>
            </div>
          )}

          <div>
            <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Clock className="h-4 w-4 mr-2" />
              Member Since
            </div>
            <div className="text-sm text-gray-600">
              {user.createdAt.toLocaleDateString()}
            </div>
          </div>

          {user.lastActive && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Last Active</div>
              <div className="text-sm text-gray-600">
                {user.lastActive.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Media Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Image className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{user.imageIds?.length || 0}</div>
            <div className="text-sm text-gray-600">Images</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Music className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{user.voiceIds?.length || 0}</div>
            <div className="text-sm text-gray-600">Voices</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FolderOpen className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{user.projectIds?.length || 0}</div>
            <div className="text-sm text-gray-600">Projects</div>
          </div>
        </div>

        {/* Recent Activity */}
        {(user.imageIds?.length > 0 || user.voiceIds?.length > 0) && (
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {user.imageIds?.slice(-3).map((imageId) => (
                <div key={imageId} className="flex items-center text-sm text-gray-600">
                  <Image className="h-4 w-4 text-blue-500 mr-2" />
                  <span>Image uploaded: <span className="font-mono text-xs">{imageId}</span></span>
                </div>
              ))}
              {user.voiceIds?.slice(-3).map((voiceId) => (
                <div key={voiceId} className="flex items-center text-sm text-gray-600">
                  <Music className="h-4 w-4 text-green-500 mr-2" />
                  <span>Voice uploaded: <span className="font-mono text-xs">{voiceId}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={loadUser}
          className="w-full mt-4 px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors"
        >
          Refresh Profile
        </button>
      </div>
    </div>
  );
};