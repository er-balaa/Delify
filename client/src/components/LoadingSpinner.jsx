import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ fullScreen = true }) => {
    const containerStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: fullScreen ? '100vh' : '300px',
        paddingTop: fullScreen ? 0 : '2rem'
    };

    return (
        <div style={containerStyle}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '4px solid var(--primary)',
                    borderRadius: '50%'
                }}
            />
        </div>
    );
};

export default LoadingSpinner;
