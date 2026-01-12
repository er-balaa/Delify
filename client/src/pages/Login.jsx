import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const syncUserWithBackend = async (user, userName) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await axios.post(`${apiUrl}/auth/sync`, {
                firebaseUid: user.uid,
                email: user.email,
                name: userName || user.email.split('@')[0]
            });
            return res.data;
        } catch (err) {
            console.error("Backend sync failed:", err);
            // We ensure login proceeds even if sync fails visually, but ideally this should be handled
            return null;
        }
    };

    const handleRedirect = (role) => {
        if (role === 'admin') navigate('/admin');
        else if (role === 'restaurant_owner') navigate('/vendor-dashboard');
        else if (role === 'delivery') navigate('/delivery-dashboard');
        else navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            let userCredential;
            if (isLogin) {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
            } else {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
            }

            const user = userCredential.user;
            const dbUser = await syncUserWithBackend(user, name);
            if (dbUser) {
                handleRedirect(dbUser.role);
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const dbUser = await syncUserWithBackend(user, user.displayName);
            if (dbUser) {
                handleRedirect(dbUser.role);
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    return (

        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, rgba(226, 55, 68, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(255, 215, 0, 0.05), transparent 40%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient background elements */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '15%',
                width: '300px',
                height: '300px',
                background: 'var(--primary)',
                opacity: '0.05',
                filter: 'blur(100px)',
                borderRadius: '50%'
            }}></div>

            <div className="card glass" style={{
                width: '100%',
                maxWidth: '480px',
                padding: '3rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                zIndex: 1
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', letterSpacing: '-1px' }}>
                        Delify<span className="text-gradient">.</span>
                    </h1>
                    <p style={{ color: 'var(--text-light)', fontSize: '1.1rem' }}>
                        {isLogin ? 'Welcome back! Please login to continue.' : 'Create an account to get started.'}
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(226, 55, 68, 0.1)',
                        border: '1px solid rgba(226, 55, 68, 0.2)',
                        color: '#ff6b6b',
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGoogleLogin}
                    className="btn btn-outline"
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-light)'
                    }}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px', height: '20px' }} />
                    <span style={{ fontSize: '1rem', fontWeight: '500' }}>Continue with Google</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }}></div>
                    OR
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }}></div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {!isLogin && (
                        <div className="input-group">
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                                style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}
                            />
                        </div>
                    )}
                    <div className="input-group">
                        <input
                            type="email"
                            className="input-field"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}
                        />
                    </div>
                    <div className="input-group">
                        <input
                            type="password"
                            className="input-field"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                            marginTop: '0.5rem',
                            width: '100%',
                            fontSize: '1.1rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)'
                        }}
                    >
                        {isLogin ? 'Log In' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-light)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            color: 'var(--primary)',
                            fontWeight: '600',
                            background: 'none',
                            marginLeft: '0.5rem'
                        }}
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
