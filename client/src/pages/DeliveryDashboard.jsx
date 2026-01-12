import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPackage, FiMapPin, FiPhone, FiCheckCircle, FiNavigation, FiClock } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';

const DeliveryDashboard = () => {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ delivered: 0, pending: 0 });

    const fetchOrders = async () => {
        if (!currentUser) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            // We need a route to get orders assigned to THIS delivery person
            // Re-using GET /orders/user/:uid might not be right if that returns orders *placed* by them.
            // But wait, the current implementation of GET /orders/user/:uid returns orders where user: uid.
            // We need GET /orders/delivery/:uid or similar. 
            // OR filtered query.
            // Let's modify the backend to support this, or add a specific route. 
            // For now, let's assume I'll add a route `GET /api/orders/delivery-partner/:uid`
            const res = await axios.get(`${apiUrl}/orders/delivery-partner/${currentUser.uid}`);
            setOrders(res.data);

            const delivered = res.data.filter(o => o.status === 'delivered').length;
            const pending = res.data.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
            setStats({ delivered, pending });

            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log("Delivery Socket Connected");
            socket.emit('join_user_room', currentUser.uid);
        });

        socket.on('new_delivery_task', (order) => {
            console.log("New Delivery Task!", order);
            // Play notification sound?
            fetchOrders();
        });

        socket.on('delivery_order_updated', (updatedOrder) => {
            console.log("Delivery Order Updated!", updatedOrder);
            setOrders(prevOrders =>
                prevOrders.map(o => o._id === updatedOrder._id ? updatedOrder : o)
            );
        });

        return () => socket.disconnect();
    }, [currentUser]);

    const updateStatus = async (orderId, newStatus) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            await axios.put(`${apiUrl}/orders/${orderId}/status`, { status: newStatus });
            fetchOrders();
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5, staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', paddingTop: 'calc(var(--header-height) + 1rem)' }}>
            <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: window.innerWidth < 768 ? 'flex-start' : 'center', marginBottom: '2rem', gap: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Delivery Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem', width: window.innerWidth < 768 ? '100%' : 'auto' }}>
                    <div style={{ flex: 1, background: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50', padding: '0.5rem 1rem', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.delivered}</div>
                        <div style={{ fontSize: '0.8rem' }}>Delivered</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255, 193, 7, 0.2)', color: '#FFC107', padding: '0.5rem 1rem', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.pending}</div>
                        <div style={{ fontSize: '0.8rem' }}>Pending</div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {orders.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '4rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '24px' }}
                    >
                        <FiPackage size={48} style={{ marginBottom: '1rem' }} />
                        <p>No assigned orders yet.</p>
                        <p style={{ fontSize: '0.9rem' }}>Stay online to receive new tasks.</p>
                    </motion.div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                    >
                        {orders.map(order => (
                            <motion.div
                                key={order._id}
                                variants={itemVariants}
                                className="glass"
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    background: order.status === 'delivered' ? 'rgba(255,255,255,0.02)' : 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Order #{order._id.slice(-6)}</h3>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            background: order.status === 'delivered' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                                            color: order.status === 'delivered' ? '#4CAF50' : '#FFC107'
                                        }}>
                                            {order.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>₹{order.totalAmount}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{order.items.length} Items</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <FiMapPin style={{ color: 'var(--primary)' }} />
                                        <div>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Pickup</div>
                                            <div>{order.restaurant?.name || 'Restaurant'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{order.restaurant?.address}</div>
                                        </div>
                                    </div>
                                    <div style={{ height: '20px', borderLeft: '2px dashed rgba(255,255,255,0.1)', marginLeft: '7px' }}></div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <FiNavigation style={{ color: '#4CAF50' }} />
                                        <div>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Dropoff</div>
                                            <div>{order.user?.name || 'Customer'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{order.deliveryAddress}</div>
                                        </div>
                                    </div>
                                </div>

                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {order.status === 'placed' || order.status === 'preparing' ? (
                                            <button
                                                onClick={() => updateStatus(order._id, 'out_for_delivery')}
                                                style={{ padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold' }}
                                            >
                                                Start Delivery
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateStatus(order._id, 'delivered')}
                                                style={{ padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#4CAF50', color: 'white', fontWeight: 'bold' }}
                                            >
                                                Mark Delivered
                                            </button>
                                        )}
                                        <button
                                            style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                            onClick={() => alert('Call feature simulated')}
                                        >
                                            <FiPhone /> Call Customer
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DeliveryDashboard;
