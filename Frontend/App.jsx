import { useState, useEffect } from 'react'
import { onAuthStateChanged } from './auth/firebase.js'
import { auth } from './auth/firebase.js'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import './App.css'

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="auth-container">
        <h1 className="auth-title">Loading...</h1>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  )
}

export default App
