import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import Loading from '../../components/student/Loading';
import Footer from '../../components/student/Footer';
import { assets } from '../../assets/assets';
import { Link } from 'react-router-dom';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/match-requests`;
const TXN_API_BASE = `${import.meta.env.VITE_API_URL}/api/transactions`;

const statusColors = {
  pending: 'text-gray-500',
  accepted: 'text-green-600',
  rejected: 'text-red-500',
  completed: 'text-blue-600',
};

const paymentStatusColors = {
  NotStarted: 'text-gray-400',
  Requested: 'text-yellow-600',
  UPIProvided: 'text-blue-600',
  Paid: 'text-green-600',
  Failed: 'text-red-600',
};

const paymentStatusLabels = {
  NotStarted: 'Not Started',
  Requested: 'Requested',
  UPIProvided: 'UPI Provided',
  Paid: 'Payment Successful',
  Failed: 'Payment Failed',
};

const Requests = () => {
  const { user, fetchPendingRequestsCount } = useContext(AppContext);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // request id
  const [upiModal, setUpiModal] = useState({ open: false, requestId: null, upi: '', loading: false, error: null });

  const getToken = () => localStorage.getItem('token');

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rec, snt] = await Promise.all([
        fetch(`${API_BASE}/received`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then(r => r.json()),
        fetch(`${API_BASE}/sent`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then(r => r.json()),
      ]);
      setReceived(rec.data || []);
      setSent(snt.data || []);
    } catch (err) {
      setError('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, []);

  const handleStatus = async (id, status) => {
    setActionLoading(id + status);
    try {
      await fetch(`${API_BASE}/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchRequests();
      fetchPendingRequestsCount();
    } catch {
      setError('Failed to update request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id) => {
    setActionLoading(id + 'cancel');
    try {
      await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchRequests();
      fetchPendingRequestsCount();
    } catch {
      setError('Failed to cancel request');
    } finally {
      setActionLoading(null);
    }
  };

  // UPI Modal logic
  const handleSubmitUpi = async () => {
    setUpiModal(m => ({ ...m, loading: true, error: null }));
    try {
      const res = await fetch(`${TXN_API_BASE}/submit-upi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ requestId: upiModal.requestId, upiId: upiModal.upi })
      });
      if (res.ok) {
        setUpiModal({ open: false, requestId: null, upi: '', loading: false, error: null });
        fetchRequests();
        fetchPendingRequestsCount();
      } else {
        const data = await res.json();
        setUpiModal(m => ({ ...m, loading: false, error: data.message || 'Failed to submit UPI.' }));
      }
    } catch {
      setUpiModal(m => ({ ...m, loading: false, error: 'Failed to submit UPI.' }));
    }
  };

  const renderRow = (req, idx, type) => {
    const isReceived = type === 'received';
    const userObj = isReceived ? req.sender : req.receiver;
    const skill = req.requestedSkill || '-';
    const typeLabel = req.requestType || '-';
    // Payment status logic
    let paymentStatusCell = null;
    if (typeLabel === 'Learn') {
      paymentStatusCell = (
        <span className={`capitalize font-semibold ${paymentStatusColors[req.paymentStatus] || ''}`}>
          {paymentStatusLabels[req.paymentStatus] || req.paymentStatus || '-'}
        </span>
      );
    } else {
      paymentStatusCell = <span className="text-gray-300">-</span>;
    }
    // Show Enter UPI button for teacher if payment requested
    const showEnterUpi = isReceived && typeLabel === 'Learn' && req.paymentStatus === 'Requested';
    return (
      <tr key={req._id} className="border-b hover:bg-gray-50">
        <td className="py-2 px-3 text-center">{idx + 1}</td>
        <td className="py-2 px-3 flex items-center gap-2">
          <img src={userObj?.avatar || assets.user_icon} alt="avatar" className="w-8 h-8 rounded-full object-cover border" />
          {isReceived ? (
            <Link
              to={`/user/${userObj?.username || userObj?._id}`}
              className="text-blue-600 underline hover:text-blue-800"
            >
              {userObj?.fullName || userObj?.username || '-'}
            </Link>
          ) : (
            <span>{userObj?.fullName || userObj?.username || '-'}</span>
          )}
        </td>
        <td className="py-2 px-3">{skill}</td>
        <td className="py-2 px-3">{new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td className={`py-2 px-3 capitalize font-semibold ${statusColors[req.status] || ''}`}>{req.status}</td>
        <td className="py-2 px-3 capitalize">{typeLabel}</td>
        <td className="py-2 px-3">{paymentStatusCell}</td>
        <td className="py-2 px-3">
          {isReceived && req.status === 'Pending' && (
            <>
              <button
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded mr-2 disabled:opacity-60"
                disabled={actionLoading}
                onClick={() => handleStatus(req._id, 'Accepted')}
              >
                {actionLoading === req._id + 'Accepted' ? '...' : 'Accept'}
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded disabled:opacity-60"
                disabled={actionLoading}
                onClick={() => handleStatus(req._id, 'Rejected')}
              >
                {actionLoading === req._id + 'Rejected' ? '...' : 'Reject'}
              </button>
            </>
          )}
          {!isReceived && req.status === 'Pending' && (
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded disabled:opacity-60"
              disabled={actionLoading}
              onClick={() => handleCancel(req._id)}
            >
              {actionLoading === req._id + 'cancel' ? '...' : 'Cancel'}
            </button>
          )}
          {showEnterUpi && (
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded ml-2"
              onClick={() => setUpiModal({ open: true, requestId: req._id, upi: '', loading: false, error: null })}
            >
              Enter UPI
            </button>
          )}
        </td>
      </tr>
    );
  };

  if (loading) return <Loading />;
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="max-w-6xl mx-auto w-full p-6 mt-8 bg-white rounded shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Requests</h2>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3 text-left">Name</th>
                <th className="py-2 px-3 text-left">Requested Skill</th>
                <th className="py-2 px-3 text-left">Date</th>
                <th className="py-2 px-3 text-left">Status</th>
                <th className="py-2 px-3 text-left">Request Type</th>
                <th className="py-2 px-3 text-left">Payment Status</th>
                <th className="py-2 px-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Received Requests */}
              {received.length > 0 && (
                <tr><td colSpan="8" className="bg-gray-50 text-gray-700 font-semibold py-2 px-3">Received Requests</td></tr>
              )}
              {received.map((req, idx) => renderRow(req, idx, 'received'))}
              {/* Sent Requests */}
              {sent.length > 0 && (
                <tr><td colSpan="8" className="bg-gray-50 text-gray-700 font-semibold py-2 px-3">Sent Requests</td></tr>
              )}
              {sent.map((req, idx) => renderRow(req, idx, 'sent'))}
              {received.length === 0 && sent.length === 0 && (
                <tr><td colSpan="8" className="text-center text-gray-400 py-8">No requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
      {/* UPI Modal (Teacher) */}
      {upiModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow-lg max-w-md w-full relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setUpiModal({ open: false, requestId: null, upi: '', loading: false, error: null })}>✕</button>
            <h2 className="text-xl font-bold mb-4">Enter your UPI ID</h2>
            <input
              type="text"
              className="border p-2 rounded w-full mb-4"
              placeholder="your-upi@bank"
              value={upiModal.upi}
              onChange={e => setUpiModal(m => ({ ...m, upi: e.target.value }))}
              disabled={upiModal.loading}
            />
            {upiModal.error && <p className="text-red-500 mb-2">{upiModal.error}</p>}
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold"
              onClick={handleSubmitUpi}
              disabled={upiModal.loading || !upiModal.upi}
            >
              {upiModal.loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests; 