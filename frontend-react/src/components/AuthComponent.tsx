import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import { User, LogOut, LogIn } from 'lucide-react';

export const AuthComponent: React.FC = () => {
  const { currentUser, userMetadata, signInWithGoogle, logout } = useAuth();

  if (currentUser) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {userMetadata?.photoURL ? (
            <img
              src={userMetadata.photoURL}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <User className="w-8 h-8 text-gray-600 p-1 bg-gray-200 rounded-full" />
          )}
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {userMetadata?.displayName || 'User'}
            </div>
            <div className="text-gray-600">{userMetadata?.email}</div>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={signInWithGoogle}
      className="flex items-center space-x-2"
    >
      <LogIn className="w-4 h-4" />
      <span>Sign In with Google</span>
    </Button>
  );
};