import React, { useContext, useEffect, useState, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';
import PasswordInput from '../../components/student/PasswordInput';

const EditProfile = () => {
  const { user, fetchCurrentUser } = useContext(AppContext);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    username: '',
    phone: '',
    location: '',
    bio: '',
    avatar: '',
    password: '',
    socialLinks: {
      linkedin: '',
      github: '',
      twitter: ''
    }
  });
  const [skillsOffered, setSkillsOffered] = useState([]);
  const [skillsWanted, setSkillsWanted] = useState([]);
  const [newSkillOffered, setNewSkillOffered] = useState('');
  const [newSkillWanted, setNewSkillWanted] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for change password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(null);

  // Refs for focusing inputs
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const phoneRef = useRef(null);
  const locationRef = useRef(null);
  const bioRef = useRef(null);

  // Modal state for Skill Offered
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillForm, setSkillForm] = useState({
    skillName: '',
    description: '',
    experienceLevel: 'intermediate',
    hourlyRate: '',
    highlights: []
  });
  const [highlightForm, setHighlightForm] = useState({ type: 'link', url: '', title: '', description: '' });
  const [skillModalError, setSkillModalError] = useState(null);
  const [skillModalLoading, setSkillModalLoading] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState(null);

  // Add missing state for skillWantedError
  const [skillWantedError, setSkillWantedError] = useState("");

  const openSkillModal = (skill = null) => {
    if (skill) {
      setSkillForm({
        skillName: skill.skillName || '',
        description: skill.description || '',
        experienceLevel: skill.experienceLevel || 'intermediate',
        hourlyRate: skill.hourlyRate?.toString() || '',
        highlights: skill.highlights || []
      });
      setEditingSkillId(skill._id);
    } else {
      setSkillForm({ skillName: '', description: '', experienceLevel: 'intermediate', hourlyRate: '', highlights: [] });
      setEditingSkillId(null);
    }
    setHighlightForm({ type: 'link', url: '', title: '', description: '' });
    setSkillModalError(null);
    setShowSkillModal(true);
  };
  const closeSkillModal = () => setShowSkillModal(false);

  const handleSkillFormChange = (e) => {
    const { name, value } = e.target;
    setSkillForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleHighlightFormChange = (e) => {
    const { name, value } = e.target;
    setHighlightForm((prev) => ({ ...prev, [name]: value }));
  };
  const addHighlight = () => {
    if (!highlightForm.url) return;
    setSkillForm((prev) => ({ ...prev, highlights: [...prev.highlights, highlightForm] }));
    setHighlightForm({ type: 'link', url: '', title: '', description: '' });
  };
  const removeHighlight = (idx) => {
    setSkillForm((prev) => ({ ...prev, highlights: prev.highlights.filter((_, i) => i !== idx) }));
  };
  const handleSaveSkill = async () => {
    setSkillModalError(null);
    if (!skillForm.skillName || !skillForm.hourlyRate) {
      setSkillModalError('Skill name and hourly rate are required.');
      return;
    }
    // Prevent duplicate skill names (case-insensitive)
    const duplicate = skillsOffered.some(s => s.skillName.toLowerCase() === skillForm.skillName.toLowerCase() && s._id !== editingSkillId);
    if (duplicate) {
      setSkillModalError('You already have a skill with this name.');
      return;
    }
    setSkillModalLoading(true);
    try {
      let res, data;
      if (editingSkillId) {
        // Edit existing skill
        res = await fetch(`${import.meta.env.VITE_API_URL}/api/skills/${editingSkillId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            skillName: skillForm.skillName,
            description: skillForm.description,
            experienceLevel: skillForm.experienceLevel,
            hourlyRate: Number(skillForm.hourlyRate),
            highlights: skillForm.highlights
          }),
        });
        data = await res.json();
        if (res.ok) {
          setSkillsOffered((prev) => prev.map(s => s._id === editingSkillId ? data.data : s));
          setShowSkillModal(false);
        } else {
          setSkillModalError(data.message || 'Failed to update skill');
        }
      } else {
        // Add new skill
        res = await fetch(`${import.meta.env.VITE_API_URL}/api/skills`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            skillName: skillForm.skillName,
            description: skillForm.description,
            experienceLevel: skillForm.experienceLevel,
            hourlyRate: Number(skillForm.hourlyRate),
            highlights: skillForm.highlights
          }),
        });
        data = await res.json();
        if (res.ok) {
          setSkillsOffered((prev) => [...prev, data.data]);
          setShowSkillModal(false);
        } else {
          setSkillModalError(data.message || 'Failed to add skill');
        }
      }
    } catch (err) {
      setSkillModalError('Failed to save skill');
    } finally {
      setSkillModalLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        email: user.email || '',
        username: user.username || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        password: '',
        socialLinks: {
          linkedin: user.socialLinks?.linkedin || '',
          github: user.socialLinks?.github || '',
          twitter: user.socialLinks?.twitter || ''
        }
      });
      setSkillsOffered(user.skillsOffered || []);
      setSkillsWanted(user.skillsWanted || []);
    }
  }, [user]);

  useEffect(() => {
    const fetchMySkills = async () => {
      if (!user?._id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/skills/user/${user._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setSkillsOffered(data.data);
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchMySkills();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('socialLinks.')) {
      const key = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [key]: value
        }
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      setForm((prev) => ({ ...prev, avatar: URL.createObjectURL(e.target.files[0]) }));
    }
  };

  const handleEditField = async (field) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // PATCH /api/users/update-account
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/update-account`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ [field]: form[field] }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Profile updated!');
        fetchCurrentUser();
      } else {
        setError(data.message || 'Update failed');
      }
    } catch (err) {
      setError('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/avatar`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Avatar updated!');
        fetchCurrentUser();
      } else {
        setError(data.message || 'Avatar update failed');
      }
    } catch (err) {
      setError('Avatar update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkillOffered = async () => {
    if (!newSkillOffered.trim()) return;
    // POST /api/skill-offers
    // For now, just update local state
    setSkillsOffered([...skillsOffered, { skillName: newSkillOffered }]);
    setNewSkillOffered('');
    // TODO: Call backend
  };

  const handleRemoveSkillOffered = async (skillId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/skills/${skillId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        setSkillsOffered((prev) => prev.filter((s) => s._id !== skillId));
      }
    } catch (err) {
      // Optionally show an error
    }
  };

  const handleAddSkillWanted = async () => {
    if (!newSkillWanted.trim()) return;
    // Prevent duplicate
    if (skillsWanted.some(s => s.toLowerCase() === newSkillWanted.trim().toLowerCase())) {
      setSkillWantedError('Skill already exists in your wanted list.');
      setTimeout(() => setSkillWantedError(null), 2500);
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/skills-wanted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ skill: newSkillWanted.trim() }),
      });
      if (res.ok) {
        setSkillsWanted([...skillsWanted, newSkillWanted.trim()]);
        setNewSkillWanted('');
        setSkillWantedError(null);
      }
    } catch (err) {
      // Optionally show error
    }
  };

  const handleRemoveSkillWanted = async (skill) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/skills-wanted`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ skill }),
      });
      if (res.ok) {
        setSkillsWanted(skillsWanted.filter((s) => s !== skill));
      }
    } catch (err) {
      // Optionally show error
    }
  };

  // Add a handler to save all changes at once
  const handleSaveAll = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          location: form.location,
          bio: form.bio,
          password: form.password,
          socialLinks: form.socialLinks, // <-- ensure this is included
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Profile updated!');
        fetchCurrentUser();
      } else {
        setError(data.message || 'Update failed');
      }
    } catch (err) {
      setError('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError(null);
    setPwSuccess(null);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwSuccess('Password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwError(data.message || 'Password change failed');
      }
    } catch (err) {
      setPwError('Password change failed');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 mt-8">
      <div className="flex items-center gap-6 mb-8">
        <div className="relative">
          <img
            src={form.avatar || assets.profile_img}
            alt="avatar"
            className="w-28 h-28 rounded-full object-cover border-2 border-blue-400"
          />
          <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <span role="img" aria-label="edit">✏️</span>
          </label>
        </div>
        <div>
          <h2 className="text-2xl font-bold">{form.fullName}</h2>
          <p className="text-gray-500">{form.email}</p>
        </div>
        {avatarFile && (
          <button className="ml-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={handleAvatarUpload} disabled={loading}>
            Save Avatar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative">
          <label className="block text-gray-700">Full Name</label>
          <input ref={fullNameRef} className="w-full p-2 pr-10 rounded bg-gray-100" name="fullName" value={form.fullName} onChange={handleInputChange} disabled={loading} />
          <button type="button" className="absolute top-8 right-2 p-2 bg-blue-100 text-blue-700 rounded-full" disabled title="Edit Full Name" style={{top: '2.5rem'}}>
            <span role="img" aria-label="edit">✏️</span>
          </button>
        </div>
        <div className="relative">
          <label className="block text-gray-700">Email</label>
          <input ref={emailRef} className="w-full p-2 pr-10 rounded bg-gray-100" name="email" value={form.email} onChange={handleInputChange} disabled={loading} />
          <button type="button" className="absolute top-8 right-2 p-2 bg-blue-100 text-blue-700 rounded-full" disabled title="Edit Email" style={{top: '2.5rem'}}>
            <span role="img" aria-label="edit">✏️</span>
          </button>
        </div>
        <div>
          <label className="block text-gray-700">Username</label>
          <input className="w-full p-2 rounded bg-gray-100" name="username" value={form.username} disabled />
        </div>
        <div className="relative">
          <label className="block text-gray-700">Phone</label>
          <input ref={phoneRef} className="w-full p-2 pr-10 rounded bg-gray-100" name="phone" value={form.phone} onChange={handleInputChange} disabled={loading} />
          <button type="button" className="absolute top-8 right-2 p-2 bg-blue-100 text-blue-700 rounded-full" disabled title="Edit Phone" style={{top: '2.5rem'}}>
            <span role="img" aria-label="edit">✏️</span>
          </button>
        </div>
        <div className="relative">
          <label className="block text-gray-700">Location</label>
          <input ref={locationRef} className="w-full p-2 pr-10 rounded bg-gray-100" name="location" value={form.location} onChange={handleInputChange} disabled={loading} />
          <button type="button" className="absolute top-8 right-2 p-2 bg-blue-100 text-blue-700 rounded-full" disabled title="Edit Location" style={{top: '2.5rem'}}>
            <span role="img" aria-label="edit">✏️</span>
          </button>
        </div>
        {/* Social Links Section */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700">LinkedIn</label>
            <input className="w-full p-2 rounded bg-gray-100" name="socialLinks.linkedin" value={form.socialLinks.linkedin} onChange={handleInputChange} placeholder="LinkedIn URL" />
          </div>
          <div>
            <label className="block text-gray-700">GitHub</label>
            <input className="w-full p-2 rounded bg-gray-100" name="socialLinks.github" value={form.socialLinks.github} onChange={handleInputChange} placeholder="GitHub URL" />
          </div>
          <div>
            <label className="block text-gray-700">Twitter</label>
            <input className="w-full p-2 rounded bg-gray-100" name="socialLinks.twitter" value={form.socialLinks.twitter} onChange={handleInputChange} placeholder="Twitter URL" />
          </div>
        </div>
        <div className="md:col-span-2 relative">
          <label className="block text-gray-700">Bio</label>
          <textarea ref={bioRef} className="w-full p-2 pr-10 rounded bg-gray-100" name="bio" value={form.bio} onChange={handleInputChange} disabled={loading} />
          <button type="button" className="absolute top-8 right-2 p-2 bg-blue-100 text-blue-700 rounded-full" disabled title="Edit Bio" style={{top: '2.5rem'}}>
            <span role="img" aria-label="edit">✏️</span>
          </button>
        </div>
      </div>
      {error && <div className="text-red-500 mt-4">{error}</div>}
      {success && <div className="text-green-600 mt-4">{success}</div>}
      <div className="flex justify-end mt-8">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 disabled:opacity-60" onClick={handleSaveAll} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      {/* Skills Section */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold mb-6">Update Your Skills</h2>
        <h3 className="text-lg font-semibold mb-2">Skills Offered</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {skillsOffered.map((skill, idx) => (
            <span key={skill._id} className="bg-gray-200 px-3 py-1 rounded-full flex items-center gap-2">
              {skill.skillName}
              <button className="ml-1 text-blue-500" title="Edit" onClick={() => openSkillModal(skill)}>
                <span role="img" aria-label="edit">✏️</span>
              </button>
              <button className="ml-1 text-red-500" onClick={() => handleRemoveSkillOffered(skill._id)}>&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => openSkillModal()}>+Add</button>
        </div>
        {/* Skill Offer Modal */}
        {showSkillModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl" onClick={closeSkillModal}>&times;</button>
              <h2 className="text-xl font-bold mb-4">Add Skill Offered</h2>
              <div className="mb-3">
                <label className="block text-gray-700">Skill Name<span className="text-red-500">*</span></label>
                <input className="w-full p-2 rounded bg-gray-100" name="skillName" value={skillForm.skillName} onChange={handleSkillFormChange} />
              </div>
              <div className="mb-3">
                <label className="block text-gray-700">Description</label>
                <textarea className="w-full p-2 rounded bg-gray-100" name="description" value={skillForm.description} onChange={handleSkillFormChange} maxLength={500} />
              </div>
              <div className="mb-3">
                <label className="block text-gray-700">Experience Level</label>
                <select className="w-full p-2 rounded bg-gray-100" name="experienceLevel" value={skillForm.experienceLevel} onChange={handleSkillFormChange}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-gray-700">Hourly Rate<span className="text-red-500">*</span></label>
                <input type="number" className="w-full p-2 rounded bg-gray-100" name="hourlyRate" value={skillForm.hourlyRate} onChange={handleSkillFormChange} min={0} />
              </div>
              <div className="mb-3">
                <label className="block text-gray-700">Highlights</label>
                {skillForm.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">{h.type}: {h.title || h.url}</span>
                    <button className="text-red-500" onClick={() => removeHighlight(i)}>&times;</button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 mt-2">
                  <select name="type" value={highlightForm.type} onChange={handleHighlightFormChange} className="p-2 rounded bg-gray-100 min-w-[90px]">
                    <option value="link">Link</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="project">Project</option>
                  </select>
                  <input className="p-2 rounded bg-gray-100 flex-1 min-w-[120px]" name="url" value={highlightForm.url} onChange={handleHighlightFormChange} placeholder="URL" />
                  <input className="p-2 rounded bg-gray-100 flex-1 min-w-[90px]" name="title" value={highlightForm.title} onChange={handleHighlightFormChange} placeholder="Title" />
                  <input className="p-2 rounded bg-gray-100 flex-1 min-w-[120px]" name="description" value={highlightForm.description} onChange={handleHighlightFormChange} placeholder="Description" />
                  <button className="px-3 py-2 bg-blue-500 text-white rounded self-stretch" type="button" onClick={addHighlight}>Add</button>
                </div>
              </div>
              {skillModalError && <div className="text-red-500 mb-2">{skillModalError}</div>}
              <div className="flex justify-end mt-4">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 disabled:opacity-60" onClick={handleSaveSkill} disabled={skillModalLoading}>
                  {skillModalLoading ? 'Saving...' : 'Save Skill'}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Skills Wanted</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {skillsWanted.map((skill, idx) => (
              <span key={idx} className="bg-gray-200 px-3 py-1 rounded-full flex items-center gap-2">
                {skill}
                <button className="ml-1 text-red-500" onClick={() => handleRemoveSkillWanted(skill)}>&times;</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="p-2 rounded bg-gray-100" value={newSkillWanted} onChange={e => setNewSkillWanted(e.target.value)} placeholder="Add skill..." />
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={handleAddSkillWanted}>+Add</button>
          </div>
          {skillWantedError && <div className="text-red-500 mt-2">{skillWantedError}</div>}
        </div>
      </div>
      {/* Change Password Section */}
      <div className="mt-12 border-t pt-8">
        <h3 className="text-lg font-semibold mb-4">Change Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700">Old Password</label>
            <PasswordInput value={oldPassword} onChange={e => setOldPassword(e.target.value)} disabled={pwLoading} />
          </div>
          <div>
            <label className="block text-gray-700">New Password</label>
            <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={pwLoading} />
          </div>
          <div>
            <label className="block text-gray-700">Confirm New Password</label>
            <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={pwLoading} />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 disabled:opacity-60" onClick={handleChangePassword} disabled={pwLoading}>
            {pwLoading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
        {pwError && <div className="text-red-500 mt-2">{pwError}</div>}
        {pwSuccess && <div className="text-green-600 mt-2">{pwSuccess}</div>}
      </div>
    </div>
  );
};

export default EditProfile; 