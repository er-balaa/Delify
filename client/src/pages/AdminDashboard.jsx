import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHome, FiShoppingBag, FiMenu, FiUsers, FiTrendingUp, FiActivity, FiDollarSign, FiEdit2, FiX, FiRefreshCw, FiTruck } from 'react-icons/fi';
import { io } from 'socket.io-client';

const AdminDashboard = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        activeOrders: 0
    });

    const [orders, setOrders] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [editingRestaurant, setEditingRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setIsSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const initialFormState = {
        name: '',
        description: '',
        image: '',
        cuisine: '',
        address: '',
        deliveryTime: '',
        priceForTwo: '',
        ownerEmail: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    // Menu Item State
    const [menuItems, setMenuItems] = useState([]);
    const [editingMenuItem, setEditingMenuItem] = useState(null);
    const initialMenuItemState = {
        name: '',
        description: '',
        price: '',
        image: '',
        category: '',
        isVeg: true
    };
    const [menuItemFormData, setMenuItemFormData] = useState(initialMenuItemState);

    // Delivery Team State
    const [deliveryUsers, setDeliveryUsers] = useState([]);
    const [deliveryFormData, setDeliveryFormData] = useState({
        name: '',
        email: '',
        bikeNumber: '',
        phoneNumber: ''
    });
    const [isEditingDriver, setIsEditingDriver] = useState(null);
    const [isAddingDriver, setIsAddingDriver] = useState(false);



    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        if (editingRestaurant) {
            setFormData({
                name: editingRestaurant.name || '',
                description: editingRestaurant.description || '',
                image: editingRestaurant.image || '',
                cuisine: Array.isArray(editingRestaurant.cuisine) ? editingRestaurant.cuisine.join(', ') : editingRestaurant.cuisine || '',
                address: editingRestaurant.address || '',
                deliveryTime: editingRestaurant.deliveryTime || '',
                priceForTwo: editingRestaurant.priceForTwo || '',
                ownerEmail: editingRestaurant.ownerEmail || editingRestaurant.owner?.email || ''
            });
            fetchMenuItems(editingRestaurant._id);
        } else {
            setFormData(initialFormState);

            setMenuItems([]);
        }
    }, [editingRestaurant]);

    // Check for "Edit Intent" from other pages
    useEffect(() => {
        const editId = localStorage.getItem('editRestaurantId');
        if (editId && restaurants.length > 0) {
            const target = restaurants.find(r => r._id === editId);
            if (target) {
                setEditingRestaurant(target);
                setActiveTab('menu');
                localStorage.removeItem('editRestaurantId');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [restaurants]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const fetchAdminData = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            console.log("Fetching admin data from:", apiUrl);

            try {
                const userRes = await axios.get(`${apiUrl}/auth/${currentUser.uid}`);
                console.log("Admin Check Result:", userRes.data);

                if (userRes.data.role === 'restaurant_owner') {
                    navigate('/vendor-dashboard');
                    return;
                }

                if (userRes.data.role !== 'admin') {
                    console.warn('Access Denied: Admins only (Bypassing for Debugging)');
                }
            } catch (authErr) {
                console.warn("⚠️ Admin check failed (likely user not in DB), bypassing...", authErr);
            }

            let allOrders = [];
            let allRestaurants = [];

            try {
                const ordersRes = await axios.get(`${apiUrl}/orders/admin/all`);
                allOrders = ordersRes.data || [];
                console.log("Orders:", allOrders);
            } catch (e) {
                console.error("Failed to fetch orders:", e);
                if (showNotification) showNotification('error', 'Failed to fetch live orders');
            }

            try {
                const restaurantsRes = await axios.get(`${apiUrl}/restaurants`);
                allRestaurants = restaurantsRes.data || [];
                console.log("Restaurants:", allRestaurants);
            } catch (e) {
                console.error("Failed to fetch restaurants:", e);
                if (showNotification) showNotification('error', 'Failed to fetch restaurants');
            }

            setOrders(allOrders);
            setRestaurants(allRestaurants);
            setStats({
                totalOrders: allOrders.length,
                totalRevenue: allOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0),
                activeOrders: allOrders.filter(o => o.status !== 'delivered').length || 0
            });

        } catch (err) {
            console.error("Error fetching admin data:", err);
            setNotification({ type: 'error', message: `Data Load Error: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchAdminData();
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        if (!currentUser) return;

        const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log("Admin Socket Connected");
        });

        socket.on('new_order_admin', (data) => {
            console.log("New User Order:", data);
            showNotification('success', 'New Order Received!');
            fetchAdminData();
        });

        return () => {
            socket.disconnect();
        };
    }, [currentUser]);

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            await axios.put(`${apiUrl}/orders/${orderId}/status`, { status: newStatus });
            // Refresh data
            fetchAdminData();
        } catch (err) {
            console.error("Failed to update status", err);
            const errMsg = err.response?.data?.msg || err.response?.data?.error || err.message;
            alert(`Failed to update status: ${errMsg}`);
        }
    };

    const handleRestaurantSubmit = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const data = { ...formData };
            // Ensure cuisine is an array
            if (typeof data.cuisine === 'string') {
                data.cuisine = data.cuisine.split(',').map(c => c.trim()).filter(c => c);
            }
            data.priceForTwo = Number(data.priceForTwo);

            if (editingRestaurant) {
                await axios.put(`${apiUrl}/restaurants/${editingRestaurant._id}`, data);
                showNotification('success', 'Restaurant Updated Successfully!');
                setEditingRestaurant(null);
            } else {
                await axios.post(`${apiUrl}/restaurants`, data);
                showNotification('success', 'Restaurant Added Successfully!');
                setFormData(initialFormState);
            }

            fetchAdminData();
        } catch (err) {
            console.error(err);
            showNotification('error', 'Failed to save: ' + (err.response?.data?.error || err.message));
        }
    };

    // Menu Item Handlers
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

    const handleMenuItemSubmit = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const payload = { ...menuItemFormData, price: Number(menuItemFormData.price) };
            if (editingMenuItem) {
                await axios.put(`${apiUrl}/restaurants/menu/${editingMenuItem._id}`, payload);
                showNotification('success', 'Menu Item Updated!');
            } else {
                await axios.post(`${apiUrl}/restaurants/${editingRestaurant._id}/menu`, payload);
                showNotification('success', 'Menu Item Added!');
            }
            setMenuItemFormData(initialMenuItemState);
            setEditingMenuItem(null);
            fetchMenuItems(editingRestaurant._id);
        } catch (err) {
            console.error(err);
            showNotification('error', 'Failed to save menu item');
        }
    };

    const deleteMenuItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            await axios.delete(`${apiUrl}/restaurants/menu/${id}`);
            showNotification('success', 'Menu Item Deleted');
            fetchMenuItems(editingRestaurant._id);
        } catch (err) {
            console.error(err);
            showNotification('error', 'Failed to delete item');
        }
    };

    // Delivery Team Handlers
    const fetchDeliveryUsers = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await axios.get(`${apiUrl}/users/delivery`);
            setDeliveryUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeliverySubmit = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            if (isEditingDriver) {
                await axios.put(`${apiUrl}/users/delivery/${isEditingDriver}`, deliveryFormData);
                showNotification('success', 'Driver Details Updated');
            } else {
                await axios.post(`${apiUrl}/users/delivery`, deliveryFormData);
                showNotification('success', 'Delivery Person Added');
            }

            setDeliveryFormData({ name: '', email: '', bikeNumber: '', phoneNumber: '' });
            setIsAddingDriver(false);
            setIsEditingDriver(null);
            await fetchDeliveryUsers();
        } catch (err) {
            console.error(err);
            showNotification('error', 'Failed to save delivery person');
        }
    };

    const handleEditDriver = (user) => {
        setDeliveryFormData({
            name: user.name,
            email: user.email,
            bikeNumber: user.bikeNumber || '',
            phoneNumber: user.phoneNumber || ''
        });
        setIsEditingDriver(user._id);
        setIsAddingDriver(true);
    };

    useEffect(() => {
        if (activeTab === 'delivery') {
            fetchDeliveryUsers();
        }
    }, [activeTab]);



    const startEditMenuItem = (item) => {
        setEditingMenuItem(item);
        setMenuItemFormData({
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            category: item.category,
            isVeg: item.isVeg
        });
        // Scroll to form
        document.getElementById('menu-item-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-body)' }}>
            <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontSize: '1.5rem', fontWeight: '300', letterSpacing: '3px', color: 'var(--primary)', textTransform: 'uppercase' }}
            >
                Loading Dashboard...
            </motion.div>
        </div>
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5, staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    const SidebarItem = ({ id, icon, label }) => (
        <motion.div
            whileHover={{ scale: 1.05, x: 5, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(id)}
            style={{
                padding: '1rem',
                cursor: 'pointer',
                background: activeTab === id ? 'linear-gradient(90deg, var(--primary), transparent)' : 'transparent',
                color: activeTab === id ? 'white' : 'rgba(255,255,255,0.6)',
                borderRadius: '12px',
                marginBottom: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontWeight: activeTab === id ? '600' : '500',
                borderLeft: activeTab === id ? '4px solid white' : '4px solid transparent',
                transition: 'border 0.2s',

            }}
        >
            <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
            <span style={{ fontSize: '1rem', letterSpacing: '0.5px' }}>{label}</span>
        </motion.div>
    );

    return (
        <div className="container-fluid" style={{ maxWidth: '100%', margin: '0', display: 'flex', minHeight: '100vh', paddingTop: 'var(--header-height)', background: 'var(--bg-body)' }}>

            {/* Mobile Sidebar Overlay */}
            {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
                />
            )}

            {/* Sidebar */}
            <AnimatePresence>
                {(isSidebarOpen || !isMobile) && (
                    <motion.div
                        initial={{ x: -280, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -280, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{
                            width: '280px',
                            borderRight: '1px solid rgba(255,255,255,0.05)',
                            padding: '2rem 1.5rem',
                            position: 'fixed',
                            height: '100%',
                            top: isMobile ? 0 : 'var(--header-height)',
                            background: 'var(--bg-card)',
                            backdropFilter: 'blur(20px)',
                            zIndex: 100,
                            paddingTop: isMobile ? '5rem' : '2rem',
                            boxShadow: isMobile ? '10px 0 30px rgba(0,0,0,0.5)' : 'none'
                        }}
                    >
                        {/* Mobile Close Button */}
                        {isMobile && (
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <FiX size={20} />
                            </button>
                        )}

                        <div style={{ marginBottom: '2rem', paddingLeft: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Menu</div>
                        <SidebarItem id="dashboard" icon={<FiHome size={20} />} label="Dashboard" />
                        <SidebarItem id="orders" icon={<FiShoppingBag size={20} />} label="Live Orders" />
                        <SidebarItem id="menu" icon={<FiMenu size={20} />} label="Menu Manager" />
                        <SidebarItem id="users" icon={<FiUsers size={20} />} label="Users" />
                        <SidebarItem id="delivery" icon={<FiTruck size={20} />} label="Delivery Team" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{
                    marginLeft: isMobile ? 0 : '280px',
                    flex: 1,
                    padding: isMobile ? '1.5rem' : '3rem',
                    maxWidth: '1600px',
                    width: '100%'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isMobile && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <FiMenu size={24} />
                            </button>
                        )}
                        <motion.h1 variants={itemVariants} style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, white, transparent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                            {activeTab === 'dashboard' ? 'Overview' :
                                activeTab === 'orders' ? 'Live Orders' :
                                    activeTab === 'menu' ? 'Menu Management' : 'Users'}
                        </motion.h1>
                    </div>

                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', display: isMobile ? 'none' : 'block' }}>Welcome back, Admin</div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                        <motion.div
                            key="dashboard"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {/* Stats Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                                {[
                                    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)', icon: <FiDollarSign size={20} /> },
                                    { label: 'Total Orders', value: stats.totalOrders, color: 'var(--primary)', bg: 'rgba(226, 55, 68, 0.1)', icon: <FiTrendingUp size={20} /> },
                                    { label: 'Active Orders', value: stats.activeOrders, color: '#FFC107', bg: 'rgba(255, 193, 7, 0.1)', icon: <FiActivity size={20} /> }
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        variants={itemVariants}
                                        whileHover={{ y: -5, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                                        className="glass"
                                        style={{
                                            padding: '2rem',
                                            borderRadius: '24px',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            background: `linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)`,
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', top: '-10%', right: '-5%', fontSize: '5rem', color: stat.color, opacity: '0.1', transform: 'rotate(15deg)' }}>{React.cloneElement(stat.icon, { size: 100 })}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            <span style={{ color: stat.color }}>{stat.icon}</span> {stat.label}
                                        </div>
                                        <div style={{ fontSize: '3rem', fontWeight: '800', color: 'white' }}>{stat.value}</div>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.h3 variants={itemVariants} style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)' }}>Recent Activity</motion.h3>
                            <motion.div variants={itemVariants} className="glass" style={{ borderRadius: '24px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            <th style={{ padding: '1.5rem', textAlign: 'left', fontWeight: '500' }}>Order ID</th>
                                            <th style={{ padding: '1.5rem', textAlign: 'left', fontWeight: '500' }}>Status</th>
                                            <th style={{ padding: '1.5rem', textAlign: 'right', fontWeight: '500' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.slice(0, 5).map(order => (
                                            <tr key={order._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                <td style={{ padding: '1.5rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>#{order._id.slice(-6)}</td>
                                                <td style={{ padding: '1.5rem' }}>
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.75rem',
                                                        background: order.status === 'delivered' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)',
                                                        color: order.status === 'delivered' ? '#4CAF50' : '#2196F3',
                                                        border: `1px solid ${order.status === 'delivered' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(33, 150, 243, 0.2)'}`
                                                    }}>{order.status}</span>
                                                </td>
                                                <td style={{ padding: '1.5rem', textAlign: 'right', fontWeight: '600' }}>₹{order.totalAmount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </motion.div>
                        </motion.div>
                    )}

                    {activeTab === 'orders' && (
                        <motion.div
                            key="orders"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, y: -20 }}
                            className="glass"
                            style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem', minWidth: '800px' }}>
                                    <thead>
                                        <tr style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            <th style={{ padding: '1rem', textAlign: 'left' }}>Order ID</th>
                                            <th style={{ padding: '1rem', textAlign: 'left' }}>Customer</th>
                                            <th style={{ padding: '1rem', textAlign: 'left' }}>Restaurant</th>
                                            <th style={{ padding: '1rem', textAlign: 'left' }}>Items</th>
                                            <th style={{ padding: '1rem', textAlign: 'left' }}>Total</th>
                                            <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                                            <th style={{ padding: '1rem', textAlign: 'left' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(order => (
                                            <motion.tr
                                                key={order._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                style={{ background: 'rgba(255,255,255,0.02)' }}
                                            >
                                                <td style={{ padding: '1rem', borderRadius: '12px 0 0 12px' }}>#{order._id.slice(-6)}</td>
                                                <td style={{ padding: '1rem' }}>{order.user?.name || 'Guest'}</td>
                                                <td style={{ padding: '1rem' }}>{order.restaurant?.name || 'Unknown'}</td>
                                                <td style={{ padding: '1rem' }}>{order.items.length} items</td>
                                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>₹{order.totalAmount}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.85rem',
                                                        background:
                                                            order.status === 'delivered' ? 'rgba(76, 175, 80, 0.1)' :
                                                                order.status === 'preparing' ? 'rgba(255, 193, 7, 0.1)' :
                                                                    order.status === 'cancelled' ? 'rgba(244, 67, 54, 0.1)' :
                                                                        'rgba(33, 150, 243, 0.1)',
                                                        color:
                                                            order.status === 'delivered' ? '#4CAF50' :
                                                                order.status === 'preparing' ? '#FFC107' :
                                                                    order.status === 'cancelled' ? '#F44336' :
                                                                        '#2196F3',
                                                        border: `1px solid ${order.status === 'delivered' ? '#4CAF50' : order.status === 'preparing' ? '#FFC107' : order.status === 'cancelled' ? '#F44336' : '#2196F3'}`
                                                    }}>
                                                        {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', borderRadius: '0 12px 12px 0' }}>
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                                                        style={{
                                                            background: 'rgba(0,0,0,0.3)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            color: 'white',
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
                                                    </select>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'menu' && (
                        <motion.div
                            key="menu"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}
                        >
                            <div className="glass" style={{ padding: '3rem', borderRadius: '24px', flex: 1, border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content' }}>
                                {notification && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            marginBottom: '1.5rem',
                                            background: notification.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                            color: notification.type === 'success' ? '#4CAF50' : '#F44336',
                                            border: `1px solid ${notification.type === 'success' ? '#4CAF50' : '#F44336'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}
                                    >
                                        {notification.message}
                                    </motion.div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: '300' }}>
                                        {editingRestaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
                                    </h2>
                                    {editingRestaurant && (
                                        <button
                                            onClick={() => setEditingRestaurant(null)}
                                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                        >
                                            <FiX /> Cancel
                                        </button>
                                    )}
                                </div>
                                <form
                                    onSubmit={handleRestaurantSubmit}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                                >
                                    <div className="input-group">
                                        <label style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', display: 'block' }}>Restaurant Name</label>
                                        <input name="name" value={formData.name} onChange={handleInputChange} className="input-field" required placeholder="e.g. Burger King" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', display: 'block' }}>Description</label>
                                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="input-field" required placeholder="Short tagline" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '100%', minHeight: '80px' }} />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', display: 'block' }}>Image URL</label>
                                        <input name="image" value={formData.image} onChange={handleInputChange} className="input-field" required placeholder="https://..." style={{ background: 'rgba(0,0,0,0.2)', color: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', display: 'block' }}>Assign Owner (User Email)</label>
                                        <input name="ownerEmail" type="email" value={formData.ownerEmail} onChange={handleInputChange} className="input-field" placeholder="Enter user's email to link account" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', display: 'block' }}>Cuisines (comma separated)</label>
                                        <input
                                            name="cuisine"
                                            value={formData.cuisine}
                                            onChange={handleInputChange}
                                            className="input-field"
                                            required
                                            placeholder="Burger, American, Fast Food"
                                            style={{ background: 'rgba(0,0,0,0.2)', color: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', display: 'block' }}>Address</label>
                                        <input name="address" value={formData.address} onChange={handleInputChange} className="input-field" required placeholder="Location" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                                        <div className="input-group" style={{ flex: 1 }}>
                                            <label style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', display: 'block' }}>Delivery Time</label>
                                            <input name="deliveryTime" value={formData.deliveryTime} onChange={handleInputChange} className="input-field" required placeholder="e.g. 30-40 min" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        </div>
                                        <div className="input-group" style={{ flex: 1 }}>
                                            <label style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', display: 'block' }}>Price for Two</label>
                                            <input name="priceForTwo" value={formData.priceForTwo} onChange={handleInputChange} type="number" className="input-field" required placeholder="e.g. 500" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ padding: '1.2rem', marginTop: '1rem', fontSize: '1.1rem', borderRadius: '12px', background: 'var(--primary)', border: 'none' }}
                                    >
                                        {editingRestaurant ? 'Update Restaurant' : 'Add Restaurant'}
                                    </motion.button>
                                </form>
                            </div>

                            {editingRestaurant ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', marginLeft: '0.5rem' }}>
                                        Menu Items for {editingRestaurant.name}
                                    </h3>

                                    {/* Menu Item Form */}
                                    <div id="menu-item-form" className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                                        <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--primary)' }}>
                                            {editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                                        </h4>
                                        <form onSubmit={handleMenuItemSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <input name="name" value={menuItemFormData.name} onChange={handleMenuItemInputChange} placeholder="Item Name" className="input-field" required style={{ background: 'rgba(0,0,0,0.3)', color: 'white', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                            <textarea name="description" value={menuItemFormData.description} onChange={handleMenuItemInputChange} placeholder="Description" className="input-field" style={{ background: 'rgba(0,0,0,0.3)', color: 'white', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <input name="price" type="number" value={menuItemFormData.price} onChange={handleMenuItemInputChange} placeholder="Price (₹)" className="input-field" required style={{ background: 'rgba(0,0,0,0.3)', color: 'white', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }} />
                                                <select name="category" value={menuItemFormData.category} onChange={handleMenuItemInputChange} style={{ background: 'rgba(0,0,0,0.3)', color: 'white', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}>
                                                    <option value="">Select Category</option>
                                                    <option value="Starters">Starters</option>
                                                    <option value="Main Course">Main Course</option>
                                                    <option value="Desserts">Desserts</option>
                                                    <option value="Beverages">Beverages</option>
                                                </select>
                                            </div>
                                            <input name="image" value={menuItemFormData.image} onChange={handleMenuItemInputChange} placeholder="Image URL" className="input-field" style={{ background: 'rgba(0,0,0,0.3)', color: 'white', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                                                <input type="checkbox" name="isVeg" checked={menuItemFormData.isVeg} onChange={handleMenuItemInputChange} />
                                                Vegetarian
                                            </label>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button type="submit" style={{ padding: '0.8rem', flex: 1, background: 'var(--primary)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                                                    {editingMenuItem ? 'Update Item' : 'Add Item'}
                                                </button>
                                                {editingMenuItem && (
                                                    <button type="button" onClick={() => { setEditingMenuItem(null); setMenuItemFormData(initialMenuItemState); }} style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </form>
                                    </div>

                                    {/* Existing Menu Items List */}
                                    <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                                        {menuItems.map(item => (
                                            <motion.div
                                                key={item._id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="glass"
                                                style={{
                                                    padding: '1rem',
                                                    marginBottom: '1rem',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    background: editingMenuItem?._id === item._id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)'
                                                }}
                                            >
                                                <img src={item.image || 'https://via.placeholder.com/50'} alt={item.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <h5 style={{ margin: 0, fontSize: '1rem' }}>{item.name}</h5>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>₹{item.price}</span>
                                                    </div>
                                                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{item.category} • {item.isVeg ? 'Veg' : 'Non-Veg'}</p>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                    <button onClick={() => startEditMenuItem(item)} style={{ background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer' }}><FiEdit2 /></button>
                                                    <button onClick={() => deleteMenuItem(item._id)} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer' }}><FiX /></button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <h3 style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', marginLeft: '0.5rem' }}>Existing Restaurants ({restaurants.length})</h3>
                                        <button onClick={fetchAdminData} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Refresh</button>
                                    </div>
                                    {restaurants.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                                            No restaurants found in database.
                                        </div>
                                    ) : (
                                        restaurants.map(restaurant => (
                                            <motion.div
                                                key={restaurant._id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="glass"
                                                style={{
                                                    padding: '1.5rem',
                                                    borderRadius: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1.5rem',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    background: `linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)`
                                                }}
                                            >
                                                <img src={restaurant.image} alt={restaurant.name} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
                                                <div style={{ flex: 1 }}>
                                                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{restaurant.name}</h4>
                                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{restaurant.address}</p>
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => {
                                                        setEditingRestaurant(restaurant);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: 'white',
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <FiEdit2 />
                                                </motion.button>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'users' && (
                        <motion.div
                            key="users"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, y: 20 }}
                            style={{ padding: '6rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><FiUsers size={60} /></div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '300' }}>User Management</h2>
                            <p>Module under construction...</p>
                        </motion.div>
                    )}

                    {activeTab === 'delivery' && (
                        <motion.div
                            key="delivery"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: '300' }}>Delivery Team</h2>
                                <button
                                    onClick={() => setIsAddingDriver(!isAddingDriver)}
                                    style={{
                                        background: 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.8rem 1.5rem',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    {isAddingDriver ? 'Cancel' : 'Add Driver'}
                                </button>
                            </div>

                            {isAddingDriver && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="glass"
                                    style={{ padding: '2rem', borderRadius: '24px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}
                                >
                                    <form onSubmit={handleDeliverySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                                            <div className="input-group">
                                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>Full Name</label>
                                                <input
                                                    value={deliveryFormData.name}
                                                    onChange={(e) => setDeliveryFormData({ ...deliveryFormData, name: e.target.value })}
                                                    required
                                                    className="input-field"
                                                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                                />
                                            </div>
                                            <div className="input-group">
                                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>Email Address</label>
                                                <input
                                                    type="email"
                                                    value={deliveryFormData.email}
                                                    onChange={(e) => setDeliveryFormData({ ...deliveryFormData, email: e.target.value })}
                                                    required
                                                    className="input-field"
                                                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                                />
                                            </div>
                                            <div className="input-group">
                                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={deliveryFormData.phoneNumber}
                                                    onChange={(e) => setDeliveryFormData({ ...deliveryFormData, phoneNumber: e.target.value })}
                                                    className="input-field"
                                                    placeholder="e.g. 9876543210"
                                                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                                />
                                            </div>
                                            <div className="input-group">
                                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>Bike Number</label>
                                                <input
                                                    value={deliveryFormData.bikeNumber}
                                                    onChange={(e) => setDeliveryFormData({ ...deliveryFormData, bikeNumber: e.target.value })}
                                                    required
                                                    className="input-field"
                                                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                                                />
                                            </div>
                                        </div>
                                        <button type="submit" style={{ padding: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', height: '42px', fontWeight: 'bold', fontSize: '1rem' }}>
                                            {isEditingDriver ? 'Update Driver' : 'Save Driver'}
                                        </button>
                                    </form>
                                </motion.div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {deliveryUsers.map(user => (
                                    <motion.div
                                        key={user._id}
                                        variants={itemVariants}
                                        className="glass"
                                        style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'white', flexShrink: 0 }}>
                                                <FiTruck size={24} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                                                <div style={{ fontSize: '1.1rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '4px' }}>
                                                    {user.phoneNumber}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleEditDriver(user)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.1)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '35px',
                                                    height: '35px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    color: 'white',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                                                Bike: <span style={{ color: 'white' }}>{user.bikeNumber || 'N/A'}</span>
                                            </div>
                                            <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', fontSize: '0.75rem', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                                                Active
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div >
        </div >
    );
};

export default AdminDashboard;
