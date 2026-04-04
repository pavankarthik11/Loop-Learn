import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dummyUsers } from "../assets/assets";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
  const currency = import.meta.env.VITE_CURRENCY;
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Helper to get token
  const getToken = () => localStorage.getItem("token");

  // Fetch all users from backend
  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await res.json();
      setAllUsers((data.data && data.data.length > 0) ? data.data : dummyUsers);
    } catch (err) {
      setError("Failed to fetch users");
      setAllUsers(dummyUsers);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.data.accessToken);
        setUser(data.data.user);
        setIsSignedIn(true);
        return true;
      } else {
        setError(data.message || "Login failed");
        setIsSignedIn(false);
        return false;
      }
    } catch (err) {
      setError("Login failed");
      setIsSignedIn(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register
  const register = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/register`, {
        method: "POST",
        body: formData, // formData for file upload
      });
      const data = await res.json();
      if (res.ok) {
        return true;
      } else {
        setError(data.message || "Registration failed");
        return false;
      }
    } catch (err) {
      setError("Registration failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    console.log("Logout function started");
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/users/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: "include",
      });
      console.log("Backend logout called");
    } catch (err) {
      console.warn("Logout request failed", err);
    }

    localStorage.removeItem("token");
    setUser(null);
    setIsSignedIn(false);
    console.log("Frontend logout done");
    navigate('/'); // Redirect to landing page
  };

  // Fetch current user
  const fetchCurrentUser = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsSignedIn(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.data);
        setIsSignedIn(true);
      } else {
        setUser(null);
        setIsSignedIn(false);
      }
    } catch (err) {
      setUser(null);
      setIsSignedIn(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending requests count
  const fetchPendingRequestsCount = async () => {
    if (!localStorage.getItem('token')) return setPendingRequestsCount(0);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/match-requests/received`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        const pending = data.data.filter(r => r.status === 'Pending');
        setPendingRequestsCount(pending.length);
      } else {
        setPendingRequestsCount(0);
      }
    } catch {
      setPendingRequestsCount(0);
    }
  };

  // Optionally, fetch on mount or when user changes
  useEffect(() => {
    fetchPendingRequestsCount();
  }, [user]);

  // Calculate rating (unchanged)
  const calculateRating = (course) => {
    if (!course || !course.courseRatings || course.courseRatings.length === 0) {
            return 0;
        }
        let totalRatings = 0;
    course.courseRatings.forEach((rating) => {
      totalRatings += rating.rating;
    });
    return totalRatings / course.courseRatings.length;
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchAllUsers();
  }, []);

    const value = {
    currency,
    navigate,
    calculateRating,
    allUsers,
    user,
    isSignedIn,
    loading,
    error,
    login,
    logout,
    register,
    fetchAllUsers,
    fetchCurrentUser,
    pendingRequestsCount,
    setPendingRequestsCount,
    fetchPendingRequestsCount,
  };

  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
};