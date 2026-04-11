import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/student/PasswordInput';

const Register = () => {
  const { register, loading, error } = useContext(AppContext);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('username', username);
    formData.append('password', password);
    formData.append('phone', phone);
    if (avatar) formData.append('avatar', avatar);
    const success = await register(formData);
    if (success) {
      setSuccessMessage('Registration successful! You can now log in.');
    } else {
      setFormError('Registration failed. Please check your details.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md" encType="multipart/form-data">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
        <div className="mb-4">
          <label className="block mb-1">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Password</label>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} required className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Phone</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Avatar</label>
          <input type="file" accept="image/*" onChange={e => setAvatar(e.target.files[0])} className="w-full" />
        </div>
        {(formError || error) && <div className="text-red-500 mb-4">{formError || error}</div>}
        {successMessage && (
          <div className="text-green-600 mb-4">
            {successMessage}
            <div className="mt-4">
              <button
                type="button"
                className="w-full bg-blue-500 text-white py-2 rounded mt-2"
                onClick={() => navigate(`/login`)}
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        <div className="mt-4 text-center">
          <span>Already have an account? </span>
          <button type="button" className="text-blue-600 underline" onClick={() => navigate('/login')}>Login</button>
        </div>
      </form>
    </div>
  );
};

export default Register; 