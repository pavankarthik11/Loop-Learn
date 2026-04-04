import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Verifying...');
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/api/users/verify-email?token=${token}`)
        .then(res => res.json())
        .then(data => {
          setMessage(data.message || 'Verification complete.');
          if (data.message && data.message.toLowerCase().includes('success')) {
            setTimeout(() => {
              navigate('/login');
            }, 2000); // Redirect after 2 seconds
          }
        })
        .catch(() => setMessage('Verification failed.'));
    } else {
      setMessage('No token provided.');
    }
  }, [searchParams, navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6">Email Verification</h2>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default VerifyEmail; 