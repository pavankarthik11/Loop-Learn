import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserCard from './UserCard'

const UsersSection = () => {
  const [learnings, setLearnings] = useState([]);
  const [teachings, setTeachings] = useState([]);
  const [loadingLearnings, setLoadingLearnings] = useState(true);
  const [loadingTeachings, setLoadingTeachings] = useState(true);
  const [errorLearnings, setErrorLearnings] = useState(null);
  const [errorTeachings, setErrorTeachings] = useState(null);

  useEffect(() => {
    const fetchLearnings = async () => {
      setLoadingLearnings(true);
      setErrorLearnings(null);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/match-requests/accepted-learnings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        if (res.ok) {
          setLearnings(data.data || []);
        } else {
          setErrorLearnings(data.message || 'Failed to fetch learnings');
        }
      } catch (err) {
        setErrorLearnings('Failed to fetch learnings');
      } finally {
        setLoadingLearnings(false);
      }
    };
    const fetchTeachings = async () => {
      setLoadingTeachings(true);
      setErrorTeachings(null);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/match-requests/accepted-teachings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        if (res.ok) {
          setTeachings(data.data || []);
        } else {
          setErrorTeachings(data.message || 'Failed to fetch teachings');
        }
      } catch (err) {
        setErrorTeachings('Failed to fetch teachings');
      } finally {
        setLoadingTeachings(false);
      }
    };
    fetchLearnings();
    fetchTeachings();
  }, []);

  return (
    <>
      <div className='py-16 md:px-40 px-8'>
          <h2 className='text-2xl font-medium text-gray-800 mb-6 text-left'>My Learnings</h2>
          {loadingLearnings ? (
            <div className='p-8'>Loading users...</div>
          ) : errorLearnings ? (
            <div className='text-red-500 p-8'>{errorLearnings}</div>
          ) : (
            learnings.length === 0 ? (
              <div className='text-gray-400 text-lg p-8'>You have not yet started learning.</div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-16 gap-3 md:p-0'>
                {learnings.slice(0,4).map((user, index)=> <UserCard  key={index} user={user}/>) }
              </div>
            )
          )}
          <Link to={'/Mylearnings'} onClick={()=> scrollTo(0,0)} 
          className='text-gray-500 border border-gray-500/30 px-10 py-3 rounded'>Show all Learnings</Link>
      </div>
      <div className='py-16 md:px-40 px-8'>
          <h2 className='text-2xl font-medium text-gray-800 mb-6 text-left'>My Teachings</h2>
          {loadingTeachings ? (
            <div className='p-8'>Loading users...</div>
          ) : errorTeachings ? (
            <div className='text-red-500 p-8'>{errorTeachings}</div>
          ) : (
            teachings.length === 0 ? (
              <div className='text-gray-400 text-lg p-8'>You have not yet started teaching.</div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-16 gap-3 md:p-0'>
                {teachings.slice(0,4).map((user, index)=> <UserCard  key={index} user={user}/>) }
              </div>
            )
          )}
          <Link to={'/MyTeachings'} onClick={()=> scrollTo(0,0)} 
          className='text-gray-500 border border-gray-500/30 px-10 py-3 rounded'>Show all Teachings</Link>
      </div>
    </>
  )
}

export default UsersSection