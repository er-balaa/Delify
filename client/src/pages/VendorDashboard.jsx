import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingBag, FiMenu, FiActivity, FiDollarSign } from 'react-icons/fi';
import { io } from 'socket.io-client';

const VendorDashboard = () => {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState({
        totalOrders: 0,
        completedOrders: 0,
        activeOrders: 0,
        totalRevenue: 0
    });
    const [orders, setOrders] = useState([]);
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchVendorData = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await axios.get(`${apiUrl}/orders/vendor/${currentUser.uid}/dashboard`);

            setRestaurant(res.data.restaurant);
            setOrders(res.data.orders);
            setStats(res.data.stats);
        } catch (err) {
            console.error("Failed to load vendor data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) fetchVendorData();
    }, [currentUser]);

    // Real-time updates
    useEffect(() => {
        if (!restaurant) return;

        const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
        const socket = io(socketUrl);

        socket.emit('join_room', restaurant._id);

        socket.on('new_vendor_order', (newOrder) => {
            console.log("New Vendor Order Received!");

            // 1. Play Sound
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play();
            } catch (e) {
                console.error("Audio play failed", e);
            }

            // 2. Alert/Notification
            // Using a simple alert for immediate attention vs a subtle toast
            if (Notification.permission === "granted") {
                new Notification("New Order!", { body: `Order #${newOrder._id.slice(-4)} Received` });
            } else {
                // Fallback or request permission
                if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }

            // 3. Refresh Data
            fetchVendorData();
        });

        return () => socket.disconnect();
    }, [restaurant]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5 } }
    };

    const initialMenuItemState = {
        name: '',
        description: '',
        price: '',
        image: '',
        category: '',
        isVeg: true,
        isSellersChoice: false,
        isBestseller: false,
        spicyLevel: 0
    };

    const [menuItems, setMenuItems] = useState([]);
    const [menuItemFormData, setMenuItemFormData] = useState(initialMenuItemState);
    const [showMenuForm, setShowMenuForm] = useState(false);

    useEffect(() => {
        if (restaurant) {
            fetchMenuItems(restaurant._id);
        }
    }, [restaurant]);

    const fetchMenuItems = async (restaurantId) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await axios.get(`${apiUrl}/restaurants/${restaurantId}/menu`);
            setMenuItems(res.data);
        } catch (err) {
            console.error("Failed to fetch menu items", err);
        }
    };

    const handleMenuItemInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setMenuItemFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleOrderUpdate = async (orderId, updates) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            await axios.put(`${apiUrl}/orders/${orderId}/status`, updates);
            // Optimistic update or refresh
            fetchVendorData();
        } catch (err) {
            console.error("Update failed", err);
            const errMsg = err.response?.data?.msg || err.response?.data?.error || err.message;
            alert(`Failed to update order: ${errMsg}`);
        }
    };

    const handleMenuItemSubmit = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const payload = { ...menuItemFormData, price: Number(menuItemFormData.price) };

            await axios.post(`${apiUrl}/restaurants/${restaurant._id}/menu`, payload);

            setMenuItemFormData(initialMenuItemState);
            setShowMenuForm(false);
            fetchMenuItems(restaurant._id);
            alert("Menu Item Added Successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to add menu item");
        }
    };

    if (loading) return <div style={{ padding: '2rem', color: 'white' }}>Loading Dashboard...</div>;

    if (!restaurant) return (
        <div style={{ padding: '4rem', color: 'white', textAlign: 'center' }}>
            <h2>No Restaurant Found</h2>
            <p>Your account is not linked to any restaurant yet. Please contact Admin.</p>
        </div>
    );

    return (
        <div className="container-fluid" style={{ maxWidth: '1600px', margin: '0 auto', paddingTop: 'var(--header-height)', paddingBottom: '2rem', color: 'white' }}>
            <div style={{ padding: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{restaurant.name} Dashboard</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>Welcome back, Owner</p>

                {/* Restaurant Profile Card */}
                <div className="glass" style={{ borderRadius: '24px', padding: '2rem', display: 'flex', gap: '2rem', marginBottom: '3rem', border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <img
                        src={restaurant.image}
                        alt={restaurant.name}
                        style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid rgba(255,255,255,0.1)' }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: '700' }}>{restaurant.name}</h2>
                                <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', fontSize: '1.1rem' }}>{restaurant.address}</p>
                            </div>
                            <div style={{ background: '#4CAF50', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold' }}>
                                ⭐ {restaurant.rating}
                            </div>
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <span style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.9rem' }}>
                                🍽️ {restaurant.cuisine.join(', ')}
                            </span>
                            <span style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.9rem' }}>
                                ⏰ {restaurant.deliveryTime}
                            </span>
                            <span style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.9rem' }}>
                                💰 ₹{restaurant.priceForTwo} for two
                            </span>
                        </div>
                        <p style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
                            "{restaurant.description}"
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <StatCard label="Total Revenue" value={`₹${stats.totalRevenue}`} icon={<FiDollarSign size={24} />} color="#4CAF50" />
                    <StatCard label="Active Orders" value={stats.activeOrders} icon={<FiActivity size={24} />} color="#FFC107" />
                    <StatCard label="Total Orders" value={stats.totalOrders} icon={<FiShoppingBag size={24} />} color="#2196F3" />
                    <StatCard label="Completed" value={stats.completedOrders} icon={<FiMenu size={24} />} color="#9C27B0" />
                </div>

                {/* Menu Management Section */}
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem' }}>Menu Management</h2>
                        <button
                            onClick={() => setShowMenuForm(!showMenuForm)}
                            className="btn btn-primary"
                        >
                            {showMenuForm ? 'Cancel' : '+ Add Menu Item'}
                        </button>
                    </div>

                    {showMenuForm && (
                        <div className="glass" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ marginBottom: '1.5rem' }}>Add New Item</h3>
                            <form onSubmit={handleMenuItemSubmit} className="vendor-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="input-group">
                                    <label>Name</label>
                                    <input name="name" value={menuItemFormData.name} onChange={handleMenuItemInputChange} className="input-field" required />
                                </div>
                                <div className="input-group">
                                    <label>Price (₹)</label>
                                    <input name="price" type="number" value={menuItemFormData.price} onChange={handleMenuItemInputChange} className="input-field" required />
                                </div>
                                <div className="input-group full-width">
                                    <label>Description</label>
                                    <textarea name="description" value={menuItemFormData.description} onChange={handleMenuItemInputChange} className="input-field" rows="2" />
                                </div>
                                <div className="input-group">
                                    <label>Category</label>
                                    <input name="category" value={menuItemFormData.category} onChange={handleMenuItemInputChange} className="input-field" required placeholder="e.g. Burgers" />
                                </div>
                                <div className="input-group">
                                    <label>Image URL</label>
                                    <input name="image" value={menuItemFormData.image} onChange={handleMenuItemInputChange} className="input-field" placeholder="https://..." />
                                </div>
                                <div style={{ display: 'flex', gap: '2rem', gridColumn: 'span 2' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="checkbox" name="isVeg" checked={menuItemFormData.isVeg} onChange={handleMenuItemInputChange} /> Veg
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="checkbox" name="isBestseller" checked={menuItemFormData.isBestseller} onChange={handleMenuItemInputChange} /> Bestseller
                                    </label>
                                </div>
                                <div className="full-width">
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Item</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        {menuItems.map(item => (
                            <div key={item._id} className="glass" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                <div style={{ height: '150px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                                    <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.name}</h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.7)' }}>
                                    <span>{item.category}</span>
                                    <span style={{ fontWeight: 'bold', color: 'white' }}>₹{item.price}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Orders */}
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Full Order History</h2>
                <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Order ID</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Customer</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Address</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Items</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Amount</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Est. Time</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Ord. Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>{order._id.slice(-6)}</td>
                                        <td style={{ padding: '1rem' }}>{order.user?.name || 'Guest'}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem', maxWidth: '150px' }}>{order.deliveryAddress}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {order.items.map(i => `${i.menuItem?.name} x${i.quantity}`).join(', ')}
                                        </td>
                                        <td style={{ padding: '1rem' }}>₹{order.totalAmount}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleOrderUpdate(order._id, { status: e.target.value })}
                                                style={{
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    color: order.status === 'delivered' ? '#4CAF50' : '#FFC107',
                                                    padding: '0.5rem',
                                                    borderRadius: '8px',
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="placed">Placed</option>
                                                <option value="ordered">Ordered</option>
                                                <option value="preparing">Preparing</option>
                                                <option value="out_for_delivery">Out for Delivery</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancelled</option>
                                                <option value="out_of_stock">Out of Stock</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <input
                                                defaultValue={order.estimatedDeliveryTime || ''}
                                                placeholder="e.g. 30 mins"
                                                onBlur={(e) => handleOrderUpdate(order._id, { estimatedDeliveryTime: e.target.value })}
                                                style={{
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    color: 'white',
                                                    padding: '0.5rem',
                                                    borderRadius: '8px',
                                                    width: '100px',
                                                    outline: 'none'
                                                }}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem' }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <style>{`
                @media (max-width: 768px) {
                    .vendor-form-grid { grid-template-columns: 1fr !important; }
                    .full-width { grid-column: span 1 !important; }
                    .container-fluid { padding-left: 1rem !important; padding-right: 1rem !important; }
                }
                .full-width { grid-column: span 2; }
            `}</style>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }) => (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: `${color}20`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>{label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{value}</div>
        </div>
    </div>
);

export default VendorDashboard;
