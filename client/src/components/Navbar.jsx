import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { auth } from '../firebase';
import { FiMenu, FiX, FiShoppingBag } from 'react-icons/fi';

const Navbar = () => {
    const { currentUser, dbUser } = useAuth();
    const { cart } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    if (location.pathname === '/login') {
        return null;
    }

    const handleLogout = async () => {
        try {
            await auth.signOut();
            setIsOpen(false);
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    const toggleMenu = () => setIsOpen(!isOpen);

    const NavItems = () => (
        <>
            <Link to="/restaurants" className="btn-ghost" onClick={() => setIsOpen(false)} style={{ fontSize: '1.05rem', fontWeight: '500', display: 'block', padding: '0.5rem 0' }}>Restaurants</Link>

            {currentUser ? (
                <>
                    <Link to="/orders" className="btn-ghost" onClick={() => setIsOpen(false)} style={{ fontSize: '1.05rem', fontWeight: '500', display: 'block', padding: '0.5rem 0' }}>My Orders</Link>

                    <div className="role-badges" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(dbUser?.role === 'admin' || currentUser.email === 'delifyadmin@gmail.com') && (
                            <Link to="/admin" onClick={() => setIsOpen(false)} style={{ textDecoration: 'none' }}>
                                <span style={{
                                    background: '#FFC107',
                                    color: 'black',
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.5px',
                                    display: 'inline-block',
                                    cursor: 'pointer'
                                }}>
                                    ADMIN DASHBOARD
                                </span>
                            </Link>
                        )}

                        {dbUser?.role === 'restaurant_owner' && (
                            <Link to="/vendor-dashboard" onClick={() => setIsOpen(false)} style={{ textDecoration: 'none' }}>
                                <span style={{
                                    background: '#4CAF50',
                                    color: 'white',
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.5px',
                                    display: 'inline-block',
                                    cursor: 'pointer'
                                }}>
                                    OWNER DASHBOARD
                                </span>
                            </Link>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                        <Link to="/profile" onClick={() => setIsOpen(false)} style={{ textDecoration: 'none' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--bg-surface)',
                                border: currentUser.email === 'delifyadmin@gmail.com' ? '2px solid #FFC107' : '1px solid var(--border-light)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: currentUser.email === 'delifyadmin@gmail.com' ? '#FFC107' : 'var(--primary)',
                                fontSize: '1.2rem',
                                cursor: 'pointer'
                            }}>
                                {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                            </div>
                        </Link>
                        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.6em 1.2em', fontSize: '0.9rem' }}>
                            Logout
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <Link to="/login" onClick={() => setIsOpen(false)} className="btn btn-ghost" style={{ fontSize: '1rem', display: 'block', padding: '0.5rem 0' }}>Log in</Link>
                    <Link to="/login" onClick={() => setIsOpen(false)} className="btn btn-primary" style={{ padding: '0.7em 1.5em', display: 'inline-block', marginTop: '0.5rem' }}>Sign Up</Link>
                </>
            )}
        </>
    );

    return (
        <header className="header glass fixed top-0 w-full z-50" style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center' }}>
            <div className="container-fluid" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1600px', margin: '0 auto', width: '100%', position: 'relative' }}>
                <Link to="/" style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-1px', paddingLeft: '1rem', textDecoration: 'none', color: 'var(--text-main)' }}>
                    Delify<span className="text-gradient">.</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="desktop-nav" style={{ display: 'flex', gap: '2rem', alignItems: 'center', paddingRight: '1rem' }}>
                    <NavItems />
                    <Link to="/cart" className="btn btn-primary" style={{ padding: '0.7em 1.5em', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                        <FiShoppingBag size={20} />
                        {cartCount > 0 && <span style={{ background: 'white', color: 'var(--primary)', borderRadius: '20px', padding: '1px 8px', fontSize: '0.85rem', fontWeight: '800' }}>{cartCount}</span>}
                    </Link>
                </nav>

                {/* Mobile Menu Toggle & Cart Icon */}
                <div className="mobile-toggle" style={{ display: 'none', paddingRight: '1rem', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/cart" className="btn btn-primary" style={{ padding: '0.5em 1em', display: 'flex', gap: '0.5rem', fontSize: '0.9rem', alignItems: 'center' }}>
                        <FiShoppingBag size={18} />
                        {cartCount > 0 && <span style={{ background: 'white', color: 'var(--primary)', borderRadius: '20px', padding: '0px 6px', fontSize: '0.75rem', fontWeight: '800' }}>{cartCount}</span>}
                    </Link>
                    <button onClick={toggleMenu} style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer' }}>
                        {isOpen ? <FiX /> : <FiMenu />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown */}
            {isOpen && (
                <div className="glass mobile-menu" style={{
                    position: 'absolute',
                    top: 'var(--header-height)',
                    left: 0,
                    width: '100%',
                    padding: '2rem',
                    flexDirection: 'column',
                    gap: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', // Overridden by media query usually, but here handled by JS conditional
                    maxHeight: 'calc(100vh - var(--header-height))',
                    overflowY: 'auto'
                }}>
                    <NavItems />
                </div>
            )}

            <style>{`
                @media (max-width: 900px) {
                    .desktop-nav {
                        display: none !important;
                    }
                    .mobile-toggle {
                        display: flex !important;
                    }
                    .role-badges {
                        flex-direction: row !important;
                        flex-wrap: wrap;
                    }
                }
            `}</style>
        </header>
    );
};

export default Navbar;
