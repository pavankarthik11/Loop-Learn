import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading";
import { assets } from "../../assets/assets";
// import humanizeDuration from "humanize-duration";
import Footer from "../../components/student/Footer";
// import YouTube from 'react-youtube'
import Rating from '../../components/student/Rating';
// import DailyVideoCall from '../../components/student/DailyVideoCall';

// Jitsi modal component
const JitsiMeetModal = ({ roomName, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div className="bg-white rounded shadow-lg p-4 relative w-full max-w-2xl h-[80vh] flex flex-col">
      <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>✕</button>
      <iframe
        src={`https://8x8.vc/${roomName}`}
        allow="camera; microphone; fullscreen; display-capture"
        style={{ width: '100%', height: '100%', border: 0, borderRadius: 8 }}
        title="LoopLearn Meeting"
      />
    </div>
  </div>
);


const UserDetails = () => {
  const { username } = useParams();

  const [userData, setUserData] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestLoading, setRequestLoading] = useState(null); // index+type
  const [requestMsg, setRequestMsg] = useState([]);
  const [acceptedSkills, setAcceptedSkills] = useState([]); // List of skill names with accepted requests
  const [requestedSkills, setRequestedSkills] = useState([]); // List of skill names with pending or accepted requests
  const [paymentModal, setPaymentModal] = useState({ open: false, qr: null, loading: false, error: null });
  const [upiModal, setUpiModal] = useState({ open: false, skill: null, requestId: null, upi: '', loading: false, error: null });
  const [learnRequests, setLearnRequests] = useState([]); // All learn requests between users
  const [transactionId, setTransactionId] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [paymentPolling, setPaymentPolling] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [userReviews, setUserReviews] = useState([]);
  const [meetingRoom, setMeetingRoom] = useState(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [meetingRequestLoading, setMeetingRequestLoading] = useState(false);

  const { allUsers, calculateRating, currency, user } = useContext(AppContext);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile/${username}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setUserData(data.data);
      } else {
        setError("User not found");
      }
    } catch (err) {
      setError("Failed to fetch user");
    } finally {
      setLoading(false);
    }
  };
 


  useEffect(() => {
    fetchUserData();
  }, [allUsers, username]);

  // Fetch accepted requests between current user and viewed user
  useEffect(() => {
    const fetchAcceptedRequests = async () => {
      if (!user || !userData) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/match-requests/accepted-between`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            userA: user._id,
            userB: userData._id
          })
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          // Store normalized skill names for which there is an accepted request
          setAcceptedSkills(data.data.map(r => r.requestedSkill.trim().toLowerCase()));
        }
      } catch {}
    };
    if (user && userData) fetchAcceptedRequests();
  }, [user, userData]);

  // Fetch requests (pending or accepted) between current user and viewed user
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user || !userData) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/match-requests/requests-between`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            userA: user._id,
            userB: userData._id
          })
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          // Store normalized skill names for which there is a pending or accepted request
          setRequestedSkills(data.data.map(r => r.requestedSkill.trim().toLowerCase()));
        }
      } catch {}
    };
    if (user && userData) fetchRequests();
  }, [user, userData]);

  // Fetch all learn requests between users
  useEffect(() => {
    const fetchLearnRequests = async () => {
      if (!user || !userData) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/match-requests/requests-between`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ userA: user._id, userB: userData._id })
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          setLearnRequests(data.data.filter(r => r.requestType === 'Learn'));
        }
      } catch {}
    };
    if (user && userData) fetchLearnRequests();
  }, [user, userData]);

  // Helper: get learn request for a skill
  const getLearnRequestForSkill = (skillName) => {
    const norm = skillName.trim().toLowerCase();
    return learnRequests.find(r => r.requestedSkill.trim().toLowerCase() === norm);
  };

  // Pay Now (learner)
  const handlePayNow = async (requestId) => {
    setPaymentModal({ open: true, qr: null, loading: true, error: null });
    setTransactionId(null);
    try {
      // 1. Request payment (existing logic)
      await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/request-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ requestId })
      });
      // 2. Create transaction and store ID
      // (Assume backend creates transaction and returns it, or fetch it here)
      // For now, try to fetch the latest transaction for this user/request
      let txnId = null;
      const txnRes = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/user`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const txnData = await txnRes.json();
      if (txnRes.ok && Array.isArray(txnData.data)) {
        // Find the latest transaction for this request
        const txn = txnData.data.find(t => t.relatedRequest && t.relatedRequest._id === requestId);
        if (txn) txnId = txn._id;
      }
      setTransactionId(txnId);
      // Poll for QR code
      let qr = null, tries = 0;
      while (!qr && tries < 10) {
        await new Promise(res => setTimeout(res, 2000));
        const qrRes = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/qr/${requestId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const qrData = await qrRes.json();
        if (qrRes.ok && qrData.data && qrData.data.qrCode) qr = qrData.data.qrCode;
        tries++;
      }
      if (qr) setPaymentModal({ open: true, qr, loading: false, error: null });
      else setPaymentModal({ open: true, qr: null, loading: false, error: 'UPI not provided yet. Please wait.' });
    } catch (err) {
      setPaymentModal({ open: true, qr: null, loading: false, error: 'Failed to request payment.' });
    }
  };

  // Teacher submits UPI
  const handleSubmitUpi = async () => {
    setUpiModal(m => ({ ...m, loading: true, error: null }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/submit-upi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ requestId: upiModal.requestId, upiId: upiModal.upi })
      });
      if (res.ok) setUpiModal({ open: false, skill: null, requestId: null, upi: '', loading: false, error: null });
      else {
        const data = await res.json();
        setUpiModal(m => ({ ...m, loading: false, error: data.message || 'Failed to submit UPI.' }));
      }
    } catch {
      setUpiModal(m => ({ ...m, loading: false, error: 'Failed to submit UPI.' }));
    }
  };

  // Add this function to update transaction status
  const updateTransactionStatus = async (transactionId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'success' }),
      });
      // Optionally, refresh requests or user data here
    } catch (err) {
      alert('Failed to update payment status.');
    }
  };


  const toggleSection = (index)=> {
    setOpenSections((prev)=>(
      {...prev,
        [index]: !prev[index],
      }
    ))
  }

  // Helper to get skill name from id or object, async version
  const fetchSkillNameIfNeeded = async (skill) => {
    if (typeof skill === 'string') return skill;
    if (typeof skill === 'object' && skill.skillName) return skill.skillName;
    // If skill is an ObjectId, fetch from backend
    if (typeof skill === 'object' && skill._id) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/skill-offers/${skill._id}`);
        const data = await res.json();
        if (res.ok && data.data && data.data.skillName) {
          return data.data.skillName;
        }
      } catch {}
      return skill._id;
    }
    return skill;
  };

  // Send Swap Request
  const handleSwap = async (skill, index) => {
    setRequestLoading('swap' + index);
    setRequestMsg(msgs => {
      const newMsgs = [...msgs];
      newMsgs[index] = null;
      return newMsgs;
    });
    try {
      const skillName = await fetchSkillNameIfNeeded(skill);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/match-requests/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          receiverId: userData._id,
          requestedSkill: skillName,
          message: '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequestMsg(msgs => {
          const newMsgs = [...msgs];
          newMsgs[index] = 'Swap request sent!';
          return newMsgs;
        });
      } else {
        setRequestMsg(msgs => {
          const newMsgs = [...msgs];
          newMsgs[index] = data.message || 'Failed to send swap request';
          return newMsgs;
        });
      }
    } catch (err) {
      setRequestMsg(msgs => {
        const newMsgs = [...msgs];
        newMsgs[index] = 'Failed to send swap request';
        return newMsgs;
      });
    } finally {
      setRequestLoading(null);
    }
  };

  // Send Learn Request
  const handleLearn = async (skill, index) => {
    setRequestLoading('learn' + index);
    setRequestMsg(msgs => {
      const newMsgs = [...msgs];
      newMsgs[index] = null;
      return newMsgs;
    });
    try {
      const skillName = await fetchSkillNameIfNeeded(skill);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/match-requests/paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          receiverId: userData._id,
          requestedSkill: skillName,
          priceAgreed: (typeof skill === 'object' ? skill.hourlyRate : 0) || 0,
          message: '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequestMsg(msgs => {
          const newMsgs = [...msgs];
          newMsgs[index] = 'Learn request sent!';
          return newMsgs;
        });
      } else {
        setRequestMsg(msgs => {
          const newMsgs = [...msgs];
          newMsgs[index] = data.message || 'Failed to send learn request';
          return newMsgs;
        });
      }
    } catch (err) {
      setRequestMsg(msgs => {
        const newMsgs = [...msgs];
        newMsgs[index] = 'Failed to send learn request';
        return newMsgs;
      });
    } finally {
      setRequestLoading(null);
    }
  };

  // Determine if rating option should be shown
  const canRate = (() => {
    // Swap: acceptedSkills means accepted swap or learn requests
    // Learn: only learner can rate teacher
    // For swap, both users can rate each other if acceptedSkills is not empty
    // For learn, only learner (sender) can rate teacher (receiver)
    if (!user || !userData) return false;
    // Check for accepted swap
    const hasAcceptedSwap = acceptedSkills.length > 0;
    // Check for accepted learn where current user is learner
    const hasAcceptedLearn = learnRequests.some(r => r.requestType === 'Learn' && r.status === 'Accepted' && r.sender === user._id && r.receiver === userData._id);
    return hasAcceptedSwap || hasAcceptedLearn;
  })();

  // Check if already rated (optional: fetch from backend if needed)
  // For now, just disable after rating

  const handleSubmitRating = async () => {
    if (!userRating || hasRated) return;
    setRatingLoading(true);
    try {
      // Find a skill to rate (for demo, pick the first skill)
      const skillToRate = userData.skillsOffered && userData.skillsOffered.length > 0
        ? (typeof userData.skillsOffered[0] === 'string' ? userData.skillsOffered[0] : userData.skillsOffered[0]._id)
        : null;
      if (!skillToRate) {
        alert('No skill to rate.');
        setRatingLoading(false);
        return;
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          skillOfferId: skillToRate,
          rating: userRating,
        }),
      });
      if (res.ok) {
        setHasRated(true);
        await fetchReviews(); // Refresh reviews after rating
        await fetchUserData(); // Refresh user data to update average rating
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to submit rating');
      }
    } finally {
      setRatingLoading(false);
    }
  };

  // Fetch all reviews for this user's skills
  const fetchReviews = async () => {
    if (!userData || !userData.skillsOffered) return setUserReviews([]);
    let allReviews = [];
    let myRating = 0;
    for (const skill of userData.skillsOffered) {
      const skillId = typeof skill === 'string' ? skill : skill._id;
      if (!skillId) continue;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reviews/${skillId}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          allReviews = allReviews.concat(data.data);
          // Find if current user has rated this skill
          if (user && !myRating) {
            const myReview = data.data.find(r => r.reviewer && (r.reviewer._id === user._id || r.reviewer === user._id));
            if (myReview) myRating = myReview.rating;
          }
        }
      } catch {}
    }
    setUserReviews(allReviews);
    setUserRating(myRating); // Set your previous rating if it exists
    setHasRated(!!myRating);
  };
  useEffect(() => {
    fetchReviews();
  }, [userData]);

  // Remove all meeting request logic and UI from this file

  if (loading) return <Loading />;
  if (error) return <div className="text-red-500 p-8">{error}</div>;
  if (!user || !userData) return null;

  // Normalize skill names to lowercase and trimmed for robust comparison
  const normalize = s => (typeof s === 'string' ? s.trim().toLowerCase() : (s.skillName || '').trim().toLowerCase());
  const userSkillsOfferedNames = (user.skillsOffered || []).map(normalize);
  const userDataSkillsOfferedNames = (userData.skillsOffered || []).map(normalize);
  const userSkillsWanted = (user.skillsWanted || []).map(s => s.trim().toLowerCase());
  const userDataSkillsWanted = (userData.skillsWanted || []).map(s => s.trim().toLowerCase());

  // Debug logging
  console.log('userSkillsOfferedNames:', userSkillsOfferedNames);
  console.log('userSkillsWanted:', userSkillsWanted);
  console.log('userDataSkillsOfferedNames:', userDataSkillsOfferedNames);
  console.log('userDataSkillsWanted:', userDataSkillsWanted);

  return (
    <>
      <div className="flex md:flex-row flex-col-reverse gap-10 relative items-start justify-between md:px-36 px-8 md:pt-30 pt-20 text-left">
        <div className="absolute top-0 left-0 w-full h-section-height -z-1 bg-gradient-to-b from-cyan-100/70"></div>

        {/* left column */}
        <div className="max-w-xl z-10 text-gray-500">
          <h1 className="md:text-course-details-heading-large text-course-details-heading-small font-semibold text-gray-800">
            Welcome To My Profile
          </h1>
          <p
            className="pt-4 md:text-base text-sm"
          >Lets Learn Together.</p>

          {/* review and rating */}
          <div className="flex items-center space-x-2 pt-3 pb-1 text-sm">
            <p>{userData.averageRating}</p>
            {/* <div className="flex">
              {[...Array(5)].map((_, i) => (
                <img
                  key={i}
                  src={
                    i < Math.floor(calculateRating(courseData))
                      ? assets.star
                      : assets.star_blank
                  }
                  alt=""
                  className="w-3.5 h-3.5"
                />
              ))}
            </div> */}
            {/* <p className="text-gray-500">({userData.averageRating} {courseData.courseRatings.length > 1 ? 'ratings' : 'rating'})</p> */}

            
          </div>

          <p className="text-sm ">Skills offered by <span className="text-blue-600 underline">{userData.username}</span></p>
          
          <div className="pt-8 text-gray-800">
          <h2 className="text-xl font-semibold">Skills Offered</h2>

          <div className="pt-5">
            {userData.skillsOffered && userData.skillsOffered.length > 0 ? (
              userData.skillsOffered.map((skill, index) => {
                const skillName = normalize(skill);
                const userWantsThisSkill = userSkillsWanted.includes(skillName);
                const viewedUserWantsMySkill = userDataSkillsWanted.some(wanted =>
                  userSkillsOfferedNames.includes(wanted)
                );
                const canSwap = userWantsThisSkill && viewedUserWantsMySkill;
                // Debug for each skill
                console.log(`Skill: ${skillName}, userWantsThisSkill:`, userWantsThisSkill, ', viewedUserWantsMySkill:', viewedUserWantsMySkill, ', canSwap:', canSwap);
                const learnReq = getLearnRequestForSkill(skillName);
                const isLearner = learnReq && learnReq.sender === user._id && learnReq.status === 'Accepted';
                const isTeacher = learnReq && learnReq.receiver === user._id && learnReq.status === 'Accepted' && learnReq.paymentStatus === 'Requested';
                return (
                  <div key={index} className="border border-gray-300 bg-white mb-2 rounded">
                    {/* Toggle Header */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                      onClick={() => toggleSection(index)}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          className={`transform transition-transform ${openSections[index] ? "rotate-180" : ""}`}
                          src={assets.down_arrow_icon}
                          alt="down_arrow_icon"
                        />
                        <p className="font-medium md:text-base text-sm">
                          {typeof skill === 'string' ? skill : skill.skillName}
                        </p>
                      </div>
                    </div>
                    {/* Collapsible Content */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${openSections[index] ? "max-h-96" : "max-h-0"}`}
                    >
                      <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                        <li className="py-1 text-xs md:text-default text-gray-800">
                          <p>Description: {typeof skill === 'string' ? skill : skill.description}</p>
                        </li>
                        <li className="py-1 text-xs md:text-default text-gray-800">
                          <p>Experience Level: {typeof skill === 'string' ? skill : skill.experienceLevel}</p>
                        </li>
                        <li className="py-1 text-xs md:text-default text-gray-800">
                          <p>Hourly Rate: {typeof skill === 'string' ? skill : skill.hourlyRate}</p>
                        </li>
                        <li className="py-1 text-xs md:text-default text-gray-800">
                          <p>Highlights: {typeof skill === 'string' ? skill : skill.highlights}</p>
                        </li>
                        {/* Buttons */}
                        <li className="pt-2 flex justify-end gap-2">
                          <button
                            className={`px-4 py-1 rounded text-white text-sm font-medium ${canSwap ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 opacity-60 cursor-not-allowed'}`}
                            disabled={!canSwap || requestLoading === 'swap'+index || requestedSkills.includes(skillName)}
                            onClick={() => handleSwap(skill, index)}
                          >
                            {requestLoading === 'swap'+index ? 'Sending...' : 'Swap'}
                          </button>
                          <button
                            className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                            disabled={requestLoading === 'learn'+index || requestedSkills.includes(skillName)}
                            onClick={() => handleLearn(skill, index)}
                          >
                            {requestLoading === 'learn'+index ? 'Sending...' : 'Learn'}
                          </button>
                          {isLearner && learnReq.paymentStatus !== 'Paid' && (
                            <button
                              className="px-4 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium ml-2"
                              onClick={() => handlePayNow(learnReq._id)}
                            >
                              Pay Now
                            </button>
                          )}
                          {isTeacher && (
                            <button
                              className="px-4 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium ml-2"
                              onClick={() => setUpiModal({ open: true, skill: skillName, requestId: learnReq._id, upi: '', loading: false, error: null })}
                            >
                              Enter UPI
                            </button>
                          )}
                        </li>
                        {requestMsg[index] && <li className="pt-2 text-green-600 text-xs">{requestMsg[index]}</li>}
                      </ul>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400">No skills offered listed.</p>
            )}
          </div>
        </div>


          <div className="py-20 text-sm md:text-default">
            <h3 className="text-xl font-semibold text-gray-800">Connect with me here !</h3>
            <h3 className="text-xl font-semibold text-gray-800 pt-10">Social Links: </h3>
            {userData.socialLinks?.linkedin && (
              <p className="pt-3">
                LinkedIn : <a href={userData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{userData.socialLinks.linkedin}</a>
              </p>
            )}
            {userData.socialLinks?.github && (
              <p className="pt-3">
                GitHub : <a href={userData.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{userData.socialLinks.github}</a>
              </p>
            )}
            {userData.socialLinks?.twitter && (
              <p className="pt-3">
                Twitter : <a href={userData.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{userData.socialLinks.twitter}</a>
              </p>
            )}
            {!(userData.socialLinks?.linkedin || userData.socialLinks?.github || userData.socialLinks?.twitter) && (
              <p className="pt-3 text-gray-400">No social links provided.</p>
            )}
            {canRate && (
              <div className="pt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Rate this user</h3>
                <Rating initialRating={userRating} onRate={setUserRating} />
                <button
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                  onClick={handleSubmitRating}
                  disabled={hasRated || !userRating || ratingLoading}
                >
                  {hasRated ? 'Thank you for rating!' : ratingLoading ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            )}
          </div>


        </div>

        {/* right column */}
        <div className="max-w-course-card z-10 shadow-custom-card rounded-t md:rounded-none overflow-hidden bg-white min-w-[300px] sm:min-w-[420px]">

            {
              
              <img src={userData.avatar} alt="courseThumbnail" />
            }

          <div className="p-5">
            

            <div className="pt-0">
              <p className="md:text-md text-lg font-medium text-gray-800">Username: {userData.username}</p>
              <p className="md:text-md text-lg font-medium text-gray-800">Full Name: {userData.fullName}</p>
              <p className="md:text-md text-lg font-medium text-gray-800">Email: {userData.email}</p>
              <p className="md:text-md text-lg font-medium text-gray-800">Phone: {userData.phone}</p>
              <p className="md:text-md text-lg font-medium text-gray-800">Bio:</p>
              <p className="ml-4 pt-0 text-sm md:text-default list-disc text-gray-500">{userData.bio}</p>
              <p className="md:text-md text-lg font-medium text-gray-800">
                {/* Location: handle both string and object */}
                Location: {typeof userData.location === 'object' && userData.location !== null
                  ? `${userData.location.country || ''}${userData.location.state ? ', ' + userData.location.state : ''}${userData.location.city ? ', ' + userData.location.city : ''}`
                  : userData.location || <span className="text-gray-400">No location listed.</span>}
              </p>
              {/* Show only average rating below location */}
              <div className="mt-2">
                <span className="flex items-center gap-1 text-lg font-medium text-gray-800">
                  <img src={assets.star} alt="full star" className="w-5 h-5" />
                  <span>{userData.averageRating}</span>
                </span>
              </div>
              <hr className="my-2 border-gray-300" />
              <p className="md:text-md text-lg font-medium text-gray-800">Skills Wanted: </p>
              <div className="flex flex-wrap gap-2">
                {userData.skillsWanted && userData.skillsWanted.length > 0 ? (
                  userData.skillsWanted.map((skill, index) => (
                    <p
                      key={index}
                      className="md:text-sm text-lg font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full"
                    >
                      {skill}
                    </p>
                  ))
                ) : (
                  <p className="text-gray-400">No skills wanted listed.</p>
                )}
              </div>
            </div>
          </div>
        </div> {/* End of main flex container */}
      </div>
        <Footer />
      {/* Payment Modal (Learner) */}
      {paymentModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow-lg max-w-md w-full relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setPaymentModal({ open: false, qr: null, loading: false, error: null })}>✕</button>
            <h2 className="text-xl font-bold mb-4">Pay via UPI</h2>
            {paymentModal.loading && <p>Waiting for UPI ID and QR code...</p>}
            {paymentModal.error && <p className="text-red-500">{paymentModal.error}</p>}
            {paymentModal.qr && (
              <div className="flex flex-col items-center">
                <img src={paymentModal.qr} alt="UPI QR Code" className="w-48 h-48 mb-4" />
                <p className="text-green-600 font-semibold">Scan to pay</p>
                {paymentPolling && <p className="mt-2 text-blue-600">Waiting for payment confirmation...</p>}
              </div>
            )}
          </div>
        </div>
      )}
      {/* UPI Modal (Teacher) */}
      {upiModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow-lg max-w-md w-full relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setUpiModal({ open: false, skill: null, requestId: null, upi: '', loading: false, error: null })}>✕</button>
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
    </>
  );
};

export default UserDetails;