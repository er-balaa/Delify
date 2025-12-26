import { useState } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, googleProvider, auth } from '../auth/firebase.js';

const Login = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onAuthSuccess(result.user);
    } catch (error) {
      setError('Failed to sign in with Google: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        onAuthSuccess(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(result.user);
      }
    } catch (error) {
      setError(isSignUp ? 'Failed to create account: ' + error.message : 'Failed to sign in: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Welcome to Delify</h1>
      
      <button 
        className="auth-button google-button" 
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Continue with Google'}
      </button>

      <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-color)' }}>
        or
      </div>

      <form className="auth-form" onSubmit={handleEmailAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        <button 
          type="submit" 
          className="auth-button email-button"
          disabled={loading}
        >
          {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--primary-color)', 
            cursor: 'pointer',
            fontSize: '0.9em'
          }}
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>

      {error && (
        <div style={{ 
          color: '#ff4444', 
          fontSize: '0.9em', 
          textAlign: 'center',
          padding: '0.5rem'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Login;
