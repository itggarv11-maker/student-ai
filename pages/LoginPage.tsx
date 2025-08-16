

import React, { useState } from 'react';
import { Link, useNavigate } from 'https://esm.sh/react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/common/Spinner';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err: any) {
      if (err.message.includes("Firebase is not configured")) {
        setError(err.message);
      } else {
        setError('Failed to log in. Please check your email and password.');
      }
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="!p-8 md:!p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Welcome Back!</h1>
            <p className="mt-2 text-gray-600">Log in to continue your learning journey.</p>
          </div>
          {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-center mb-4 text-sm font-semibold">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="text-center pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Spinner colorClass='bg-white'/> : 'Log In'}
              </Button>
            </div>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign Up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;