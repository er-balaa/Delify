import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiEdit2, FiStar } from 'react-icons/fi';

const RestaurantCard = ({ restaurant }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const handleEdit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        localStorage.setItem('editRestaurantId', restaurant._id);
        navigate('/admin-dashboard');
    };

    return (
        <Link to={`/restaurant/${restaurant._id}`} style={{ display: 'block', textDecoration: 'none', height: '100%' }}>
            <div className="card-hover glass" style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-light)'
            }}>
                <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>

                    {/* Admin Edit Button */}
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={handleEdit}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'rgba(255, 255, 255, 0.9)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '35px',
                                height: '35px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 10,
                                color: 'var(--primary)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                            title="Edit Restaurant"
                        >
                            <FiEdit2 size={16} />
                        </button>
                    )}

                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        zIndex: 1
                    }}></div>
                    <img
                        src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'}
                        alt={restaurant.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.5s ease'
                        }}
                        className="card-img"
                    />
                    <style>{`
                        .card-hover:hover .card-img {
                            transform: scale(1.05);
                        }
                    `}</style>

                    {restaurant.rating && (
                        <div style={{
                            position: 'absolute',
                            bottom: '15px',
                            left: '15px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.95rem',
                            fontWeight: '700',
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <FiStar size={16} fill="#FFC107" color="#FFC107" /> {restaurant.rating}
                        </div>
                    )}

                    <div style={{
                        position: 'absolute',
                        bottom: '15px',
                        right: '15px',
                        color: 'white',
                        zIndex: 2,
                        fontSize: '0.9rem',
                        fontWeight: '500'
                    }}>
                        {restaurant.deliveryTime}
                    </div>
                </div>

                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>{restaurant.name}</h3>
                    </div>

                    <p style={{ color: 'var(--text-light)', fontSize: '1rem', marginBottom: 'auto', lineHeight: 1.5 }}>
                        {restaurant.cuisine.join(', ')}
                    </p>

                    <div style={{ height: '1px', background: 'var(--border-light)', margin: '1.2rem 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '500' }}>
                        <span style={{ color: 'var(--primary)' }}>
                            ₹{restaurant.priceForTwo} for two
                        </span>
                        <span className="btn-ghost" style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>
                            View Menu →
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default RestaurantCard;
