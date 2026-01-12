import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RestaurantCard from '../components/RestaurantCard';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import LoadingSpinner from '../components/LoadingSpinner';

const RestaurantList = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let socket;

        const fetchRestaurants = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const res = await axios.get(`${apiUrl}/restaurants`);
                setRestaurants(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRestaurants();

        // Socket.IO Connection
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const socketUrl = apiUrl.replace('/api', '');

        socket = io(socketUrl);

        socket.on('restaurant_added', (newRestaurant) => {
            setRestaurants(prev => [newRestaurant, ...prev]);
        });

        socket.on('restaurant_updated', (updatedRestaurant) => {
            setRestaurants(prev => prev.map(r => r._id === updatedRestaurant._id ? updatedRestaurant : r));
        });

        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100
            }
        }
    };

    return (
        <div className="container-fluid" style={{ paddingTop: '2rem', paddingBottom: '4rem', minHeight: '100vh' }}>
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                    Hungry? <span className="text-gradient">We got you.</span>
                </h1>
                <p style={{ color: 'var(--text-light)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                    Discover the best food from over 1,000 restaurants and get it delivered fast.
                </p>
            </div>

            {loading ? (
                <LoadingSpinner fullScreen={false} />
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '2rem',
                        padding: '1rem'
                    }}
                >
                    {restaurants.map(restaurant => (
                        <motion.div key={restaurant._id} variants={itemVariants}>
                            <RestaurantCard restaurant={restaurant} />
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
};

export default RestaurantList;
