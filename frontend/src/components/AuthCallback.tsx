import React, { useEffect } from 'react';
import { setAuthToken } from '../services/api';

interface AuthCallbackProps {
  onSuccess: () => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onSuccess }) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setAuthToken(token);
      onSuccess();
    } else {
      window.location.href = '/';
    }
  }, [onSuccess]);

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center text-white font-sans">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300">Authenticating with Google...</p>
      </div>
    </div>
  );
};
