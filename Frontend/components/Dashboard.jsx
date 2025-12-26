import { signOut, auth } from '../auth/firebase.js';

const Dashboard = ({ user, onLogout }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Welcome to Delify</h1>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          Hello, {user.displayName || user.email}!
        </div>
        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
          {user.email}
        </div>
        {user.photoURL && (
          <img 
            src={user.photoURL} 
            alt="Profile" 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              marginTop: '1rem',
              border: '2px solid var(--primary-color)'
            }} 
          />
        )}
      </div>
      
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        <p>You are successfully logged in to Delify!</p>
        <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '1rem' }}>
          Your authentication is working perfectly.
        </p>
      </div>

      <button 
        className="auth-button email-button" 
        onClick={handleLogout}
        style={{ marginTop: '1rem' }}
      >
        Sign Out
      </button>
    </div>
  );
};

export default Dashboard;
