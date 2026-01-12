import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const res = await axios.get(`${apiUrl}/auth/${currentUser.uid}`);
                setUserData(res.data);
                setAddress(res.data.address || '');
                setMsg(''); // clear errors
            } catch (err) {
                console.error("Profile load error:", err);
                setMsg(`Failed to load profile: ${err.response?.data?.msg || err.message}`);
                // Don't leave userData null if it's a transient error, maybe? 
                // Better to leave it null so we don't save over it.
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchUser();
        }
    }, [currentUser]);

    const handleSaveAddress = async () => {
        if (!userData || !userData._id) {
            setMsg("Error: User data not loaded.");
            return;
        }

        setSaving(true);
        setMsg('');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            await axios.put(`${apiUrl}/users/${userData._id}`, {
                name: userData.name,
                phoneNumber: userData.phoneNumber,
                address: userData.address
            });
            setMsg('Profile updated successfully!');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.msg || err.message || 'Failed to save address.';
            setMsg(`Error: ${errorMsg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    if (!currentUser) return <div className="container" style={{ paddingTop: '2rem' }}>Please log in.</div>;
    if (loading) return <LoadingSpinner />;

    return (
        <div className="container-fluid" style={{ paddingTop: '2rem', paddingBottom: '4rem', minHeight: '100vh', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>My Profile</h1>

            <div className="card glass" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'var(--bg-surface)',
                        border: '2px solid var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        fontSize: '2.5rem'
                    }}>
                        {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', margin: 0 }}>{userData?.name || 'User'}</h2>
                        <p style={{ color: 'var(--text-light)' }}>{userData?.email || currentUser.email}</p>
                    </div>
                </div>

                {msg && <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    background: msg.includes('Failed') ? 'rgba(255, 0, 0, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                    color: msg.includes('Failed') ? '#ff4d4d' : '#4CAF50',
                    border: `1px solid ${msg.includes('Failed') ? '#ff4d4d' : '#4CAF50'}`
                }}>
                    {msg}
                    {msg.includes('Failed') && <button onClick={() => window.location.reload()} style={{ marginLeft: '10px', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Retry</button>}
                </div>}

                <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', opacity: !userData ? 0.5 : 1, pointerEvents: !userData ? 'none' : 'auto' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Full Name</label>
                        <input
                            className="input-field"
                            type="text"
                            value={userData?.name || ''}
                            onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                            placeholder="Enter your name"
                            style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Phone Number</label>
                        <input
                            className="input-field"
                            type="tel"
                            value={userData?.phoneNumber || ''}
                            onChange={(e) => setUserData({ ...userData, phoneNumber: e.target.value })}
                            placeholder="Enter your mobile number"
                            style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white' }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: '600' }}>Delivery Address</label>
                    <textarea
                        className="input-field"
                        rows="4"
                        value={userData?.address || address} // Access from userData first
                        onChange={(e) => {
                            setAddress(e.target.value);
                            setUserData({ ...userData, address: e.target.value });
                        }}
                        placeholder="Enter your full delivery address..."
                        style={{ width: '100%', resize: 'vertical', minHeight: '100px', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white' }}
                    />
                </div>



                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleSaveAddress} className="btn btn-primary" disabled={saving || !userData}>
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                    {userData?.role === 'admin' && (
                        <button onClick={() => navigate('/admin')} className="btn" style={{ background: '#FFC107', color: 'black' }}>
                            Admin Dashboard
                        </button>
                    )}
                    <button onClick={handleLogout} className="btn btn-outline" style={{ borderColor: '#E23744', color: '#E23744' }}>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
