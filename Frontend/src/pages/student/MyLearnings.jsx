import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import SearchBar from '../../components/student/SearchBar'
import UserCard from '../../components/student/UserCard'
import { assets } from '../../assets/assets'
import Footer from '../../components/student/Footer'

const MyLearnings = () => {
  const { navigate } = useContext(AppContext)
  const [filteredUser, setFilteredUser] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState("")
  const [allPartners, setAllPartners] = useState([])

  useEffect(() => {
    const fetchAcceptedPartners = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/match-requests/accepted-learnings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        if (res.ok) {
          setAllPartners(data.data);
        } else {
          setError(data.message || 'Failed to fetch accepted partners');
        }
      } catch (err) {
        setError('Failed to fetch accepted partners');
      } finally {
        setLoading(false);
      }
    };
    fetchAcceptedPartners();
  }, []);

  useEffect(() => {
    // If any user in allPartners has skillsOffered as array of strings or ObjectIds, fetch their skills
    const fetchSkillsForPartners = async () => {
      const updatedPartners = await Promise.all(allPartners.map(async (user) => {
        if (user.skillsOffered && user.skillsOffered.length > 0 && typeof user.skillsOffered[0] === 'string' && user.skillsOffered[0].length === 24) {
          // Assume ObjectId, fetch skills
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/skills/user/${user._id}`);
            const data = await res.json();
            if (res.ok && Array.isArray(data.data)) {
              return { ...user, skillsOffered: data.data };
            }
          } catch {}
        }
        return user;
      }));
      setAllPartners(updatedPartners);
    };
    if (allPartners.length > 0 && allPartners.some(u => u.skillsOffered && typeof u.skillsOffered[0] === 'string' && u.skillsOffered[0].length === 24)) {
      fetchSkillsForPartners();
    }
  }, [allPartners]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFilteredUser(
      allPartners.filter(item => {
        if (!q) return true;
        if (item.fullName?.toLowerCase().includes(q) || item.username?.toLowerCase().includes(q)) return true;
        if (Array.isArray(item.skillsOffered)) {
          return item.skillsOffered.some(skill => {
            if (typeof skill === 'string') return skill.trim().toLowerCase().includes(q);
            if (typeof skill === 'object') {
              if (skill.skillName && skill.skillName.trim().toLowerCase().includes(q)) return true;
              if (skill.name && skill.name.trim().toLowerCase().includes(q)) return true;
            }
            return false;
          });
        }
        return false;
      })
    );
  }, [search, allPartners]);

  if (loading) return <div className='p-8'>Loading users...</div>;
  if (error) return <div className='text-red-500 p-8'>{error}</div>;

  return (
    <>
      <div className='relative md:px-36 px-8 pt-20 text-left'>
        <div className='flex md:flex-row flex-col gap-6 items-start justify-between w-full'>
          <div>
            <h1 className='text-4xl font-semibold text-gray-800'>My Learnings</h1>
            <p className='text-gray-500'>
              <span className='text-blue-600 cursor-pointer' onClick={() => navigate('/')}>Home</span> / <span>My Learnings</span></p>
          </div>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {search &&
          <div className='inline-flex items-center gap-4 px-4 py-2 border mt-8 mb-8 text-gray-600 '>
            <p>{search}</p>
            <img src={assets.cross_icon} alt="cross_icon" className='cursor-pointer' onClick={() => setSearch("")} />
          </div>
        }

        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-16 gap-3 md:p-0'>
          {filteredUser.length === 0 ? (
            <div className='text-gray-400 text-lg p-8'>You have not yet started learning.</div>
          ) : (
            filteredUser.map((user, index) => (<UserCard key={index} user={user} />))
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default MyLearnings