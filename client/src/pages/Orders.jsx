import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FiTrash2, FiPhone, FiTruck, FiStar, FiShoppingBag } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';


const DeliveryInfo = ({ order }) => {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (!order.estimatedDeliveryTime) return;

        // Check if input is a pure number (e.g. "60" or "120")
        const isNumeric = /^\d+$/.test(order.estimatedDeliveryTime);

        if (isNumeric) {
            const durationInMinutes = parseInt(order.estimatedDeliveryTime, 10);
            // Calculate target time based on when the order was last updated (which should be when the status/time changed)
            // or we could assume the timer starts NOW if we don't have a reliable start time relative to the estimate setting.
            // A better approach for "remaining time" updates is usually server-side, but here we'll approximate:
            // "Updated At" + Duration.
            const startTime = new Date(order.updatedAt).getTime();
            const targetTime = startTime + (durationInMinutes * 60 * 1000);

            const interval = setInterval(() => {
                const now = new Date().getTime();
                const difference = targetTime - now;

                if (difference <= 0) {
                    setTimeLeft("Arriving soon...");
                    clearInterval(interval);
                } else {
                    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                    setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [order.estimatedDeliveryTime, order.updatedAt]);

    if (order.status === 'delivered') {
        return (
            <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: '700', color: '#4CAF50' }}>
                Enjoy your meal!
            </span>
        );
    }

    if (order.estimatedDeliveryTime) {
        // Check if it's numeric to decide what to show
        const isNumeric = /^\d+$/.test(order.estimatedDeliveryTime);

        return (
            <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)' }}>
                Arriving in: {isNumeric ? (timeLeft || "Calculating...") : order.estimatedDeliveryTime}
            </span>
        );
    }

    return (
        <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-light)', fontStyle: 'italic' }}>
            Waiting for restaurant update...
        </span>
    );
};

const RateModal = ({ order, isOpen, onClose, onSubmit }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: '#1F1D2B', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Rate your experience</h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star}
                            onClick={() => setRating(star)}
                            style={{ cursor: 'pointer', padding: '0 4px' }}
                        >
                            <FiStar
                                size={32}
                                fill={star <= rating ? '#FFC107' : 'none'}
                                color={star <= rating ? '#FFC107' : '#444'}
                            />
                        </div>
                    ))}
                </div>
                <textarea
                    placeholder="Wanna say something? (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{
                        width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white',
                        padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', minHeight: '100px'
                    }}
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSubmit(rating, comment)} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>Submit</button>
                </div>
            </div>
        </div>
    );
};

const Orders = () => {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ratingOrder, setRatingOrder] = useState(null); // Track which order is being rated

    useEffect(() => {
        let socket;

        const fetchOrders = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const res = await axios.get(`${apiUrl}/orders/user/${currentUser.uid}`);
                setOrders(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchOrders();

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const socketUrl = apiUrl.replace('/api', '');

            socket = io(socketUrl);
            socket.emit('join_user_room', currentUser.uid);

            socket.on('order_updated', (updatedOrder) => {
                console.log("Order updated:", updatedOrder);
                setOrders(prevOrders =>
                    prevOrders.map(o => o._id === updatedOrder._id ? updatedOrder : o)
                );
            });
        }

        return () => {
            if (socket) socket.disconnect();
        };
    }, [currentUser]);

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;

        // Optimistic Update: Remove from UI immediately
        const previousOrders = [...orders];
        setOrders(prev => prev.filter(o => o._id !== orderId));

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            await axios.delete(`${apiUrl}/orders/${orderId}`);
            console.log(`Order ${orderId} deleted from Backend successfully`);
        } catch (err) {
            console.error("Delete failed, reverting UI:", err);
            // Revert UI if backend fails
            setOrders(previousOrders);
            alert("Failed to delete order from server. Please check your connection.");
        }
    };

    const handleRateSubmit = async (rating, comment) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            await axios.post(`${apiUrl}/reviews`, {
                user: currentUser.uid === ratingOrder.user._id ? ratingOrder.user._id : ratingOrder.user, // Handle populated/unpopulated
                // Wait, currentUser.uid is firebase ID. The review route expects DB ObjectID for 'user'.
                // Order object usually has populated user or at least the ID.
                // The order.user in 'orders' state is populated with {name, email, _id}.
                // So ratingOrder.user._id is the correct User ObjectId.
                // UNLESS 'orders' state is fresh from socket update which might return just ID.
                user: ratingOrder.user._id || ratingOrder.user,
                restaurant: ratingOrder.restaurant._id || ratingOrder.restaurant,
                order: ratingOrder._id,
                rating,
                comment
            });

            // Update local state to hide rate button
            setOrders(prev => prev.map(o => o._id === ratingOrder._id ? { ...o, isRated: true } : o));
            setRatingOrder(null);
            alert("Thanks for your feedback!");
        } catch (err) {
            console.error("Rating failed:", err);
            alert("Failed to submit rating");
        }
    };

    if (!currentUser) return <div className="container">Please log in to view orders.</div>;

    return (
        <div className="container-fluid" style={{ paddingTop: '2rem', paddingBottom: '4rem', minHeight: '100vh', maxWidth: '1600px', margin: '0 auto' }}>
            <RateModal
                isOpen={!!ratingOrder}
                order={ratingOrder}
                onClose={() => setRatingOrder(null)}
                onSubmit={handleRateSubmit}
            />
            <h1 style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>
                My Orders <span style={{ fontSize: '1.2rem', color: 'var(--text-light)', fontWeight: '400' }}>({orders.length})</span>
            </h1>

            {loading ? (
                <LoadingSpinner fullScreen={false} />
            ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center' }}>
                        <FiShoppingBag size={80} />
                    </div>
                    <h2 style={{ marginBottom: '1rem' }}>No orders yet</h2>
                    <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>Looks like you haven't indulged in some delicious food yet.</p>
                    <Link to="/" className="btn btn-primary">Start Ordering</Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {orders.map(order => (
                        <div key={order._id} className="card glass card-hover" style={{
                            padding: '0',
                            overflow: 'hidden',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <div style={{
                                padding: '1.5rem',
                                display: 'flex',
                                gap: '1.5rem',
                                alignItems: 'flex-start',
                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <img
                                    src={order.restaurant?.image || 'https://placehold.co/100x100?text=Rest'}
                                    alt={order.restaurant?.name}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        objectFit: 'cover',
                                        borderRadius: 'var(--radius-sm)'
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{order.restaurant?.name || 'Unknown Restaurant'}</h3>
                                        <div style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <DeliveryInfo order={order} />
                                            <div style={{
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                background: order.status === 'delivered' ? 'rgba(76, 175, 80, 0.2)' :
                                                    order.status === 'ordered' ? 'rgba(33, 150, 243, 0.2)' :
                                                        order.status === 'placed' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                                                color: order.status === 'delivered' ? '#4CAF50' :
                                                    order.status === 'ordered' ? '#2196F3' :
                                                        order.status === 'placed' ? '#FFC107' : '#2196F3'
                                            }}>
                                                {order.status === 'placed' ? 'PLACED' :
                                                    order.status === 'ordered' ? 'ORDERED' :
                                                        order.status === 'out_for_delivery' ? 'OUT FOR DELIVERY' :
                                                            order.status.replace('_', ' ').toUpperCase()}
                                            </div>
                                        </div>
                                    </div>

                                    {order.deliveryPerson && (
                                        <div style={{
                                            marginBottom: '1rem',
                                            padding: '1rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '1rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    background: 'rgba(255,255,255,0.1)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <FiTruck size={20} color="var(--primary)" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{order.deliveryPerson.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                                        {order.deliveryPerson.bikeNumber && <span>{order.deliveryPerson.bikeNumber}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {order.deliveryPerson.phoneNumber && (
                                                <a href={`tel:${order.deliveryPerson.phoneNumber}`} style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                    padding: '0.5rem 1rem', background: 'var(--primary)',
                                                    color: 'white', borderRadius: '20px', textDecoration: 'none',
                                                    fontSize: '0.85rem', fontWeight: 'bold'
                                                }}>
                                                    <FiPhone size={14} /> Call Partner
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                        {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                                    </p>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>₹{order.totalAmount}</span>
                                        <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>• {order.items.length} Items</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-light)' }}>Order Details</h4>
                                <div style={{ display: 'grid', gap: '0.8rem' }}>
                                    {order.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{
                                                    background: 'rgba(255,255,255,0.1)',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem',
                                                    color: 'var(--text-main)'
                                                }}>{item.quantity}x</span>
                                                <span style={{ color: 'var(--text-light)' }}>
                                                    {item.menuItem?.name || 'Item Unavailable'}
                                                </span>
                                            </div>
                                            <span style={{ color: 'var(--text-main)' }}>₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    {order.status === 'delivered' && !order.isRated && (
                                        <button
                                            onClick={() => setRatingOrder(order)}
                                            className="btn"
                                            style={{
                                                fontSize: '0.9rem', padding: '0.6rem 1.2rem',
                                                background: 'rgba(255, 193, 7, 0.1)', color: '#FFC107', border: '1px solid rgba(255, 193, 7, 0.2)'
                                            }}
                                        >
                                            <FiStar style={{ marginRight: '5px' }} /> Rate Food
                                        </button>
                                    )}
                                    <button className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.6rem 1.2rem' }}>
                                        Reorder
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOrder(order._id)}
                                        className="btn"
                                        style={{
                                            fontSize: '0.9rem',
                                            padding: '0.6rem 1.2rem',
                                            background: 'rgba(244, 67, 54, 0.1)',
                                            color: '#F44336',
                                            border: '1px solid rgba(244, 67, 54, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <FiTrash2 /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }
        </div >
    );
};

export default Orders;
