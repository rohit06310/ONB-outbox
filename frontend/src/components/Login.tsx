import React, { useState } from 'react';
import { setAuthToken } from '../services/api';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth flow
    window.location.href = 'http://localhost:4000/auth/google';
  };

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:4000/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.token) {
        setAuthToken(data.token);
        onLoginSuccess();
      }
    } catch (err) {
      console.error('Demo login error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">Login</h1>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-[#EAF7EE] hover:bg-[#D8F0E0] text-gray-800 font-medium py-3 px-4 rounded-xl border border-gray-200 transition-colors mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.28v3.13C3.25 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.25c-.25-.72-.38-1.49-.38-2.25s.13-1.53.38-2.25V6.62H1.28C.47 8.24 0 10.06 0 12s.47 3.76 1.28 5.38l4-3.13z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.62l4 3.13c.95-2.83 3.6-4.93 6.72-4.93z"
            />
          </svg>
          Login with Google
        </button>

        {/* Separator */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-gray-200 w-full"></div>
          <span className="bg-white px-3 text-xs text-gray-400 font-normal absolute">
            or sign up through email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleDemoLogin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#F4F6F8] rounded-xl border border-transparent focus:border-brand-500 focus:bg-white focus:outline-none text-gray-800 text-sm transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#F4F6F8] rounded-xl border border-transparent focus:border-brand-500 focus:bg-white focus:outline-none text-gray-800 text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#00A859] hover:bg-[#00924D] text-white font-medium py-3 rounded-xl transition-all shadow-md mt-4 text-sm"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
