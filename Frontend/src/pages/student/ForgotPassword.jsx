import React, { useState } from 'react';
import PasswordInput from '../../components/student/PasswordInput';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMessage('');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('OTP sent to your email.');
      setStep(2);
    } else {
      setMessage(data.message || 'Failed to send OTP.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage('');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/reset-password-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Password reset successfully! You can now log in.');
      setStep(3);
    } else {
      setMessage(data.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6">Forgot Password</h2>
        {step === 1 && (
          <>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full border px-3 py-2 rounded mb-4"
            />
            <button onClick={handleSendOtp} className="w-full bg-blue-600 text-white py-2 rounded mb-4">
              Send OTP
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="Enter OTP"
              required
              className="w-full border px-3 py-2 rounded mb-4"
            />
            <PasswordInput
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              className="w-full border px-3 py-2 rounded mb-4"
            />
            <button onClick={handleResetPassword} className="w-full bg-blue-600 text-white py-2 rounded mb-4">
              Reset Password
            </button>
          </>
        )}
        {message && <div className="text-green-600">{message}</div>}
      </form>
    </div>
  );
};

export default ForgotPassword; 