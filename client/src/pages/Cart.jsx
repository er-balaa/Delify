import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { FiShoppingBag } from 'react-icons/fi';

const Cart = () => {
    const { cart, cartTotal, updateQuantity, removeFromCart, clearCart, restaurantId } = useCart();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [address, setAddress] = useState('');

    useEffect(() => {
        if (currentUser) {
            const fetchAddress = async () => {
                try {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                    const res = await axios.get(`${apiUrl}/auth/${currentUser.uid}`);
                    if (res.data?.address) setAddress(res.data.address);
                } catch (err) {
                    console.error("Address fetch error", err);
                }
            };
            fetchAddress();
        }
    }, [currentUser]);

    const handleCheckout = async () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }

        if (!address.trim()) {
            alert("Please provide a delivery address.");
            return;
        }

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            // Validate before sending
            if (!restaurantId) {
                alert("Error: Restaurant ID missing. Please clear cart and try again.");
                return;
            }

            await axios.post(`${apiUrl}/orders`, {
                user: currentUser.uid,
                restaurant: restaurantId,
                items: cart.map(item => ({ menuItem: item._id, quantity: item.quantity, price: item.price })),
                totalAmount: cartTotal,
                deliveryAddress: address
            });

            alert("Order Successful");
            clearCart();
            navigate('/orders');
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.msg || error.message || "Failed to place order.";
            alert(`Failed: ${msg}`);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
                <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem auto',
                    border: '2px dashed var(--border-light)'
                }}>
                    <FiShoppingBag size={50} color="var(--text-muted)" />
                </div>
                <h2 style={{ margin: '1rem 0' }}>Your cart is empty</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>You can go to home page to view more restaurants</p>
                <Link to="/" className="btn btn-primary">See Restaurants near you</Link>
            </div>
        );
    }

    return (
        <div className="container flex-mobile-col" style={{ paddingTop: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div className="w-mobile-100" style={{ flex: 2, minWidth: '300px' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>Secure Checkout</h2>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {cart.map(item => (
                        <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '16px', height: '16px', border: '1px solid #4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                                    <div style={{ width: '8px', height: '8px', background: '#4CAF50', borderRadius: '50%' }}></div>
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{item.name}</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>₹{item.price}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button onClick={() => updateQuantity(item._id, item.quantity - 1)} style={{ color: 'var(--primary)', fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', fontWeight: 'bold' }}>-</button>
                                    <span style={{ fontWeight: '600' }}>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item._id, item.quantity + 1)} style={{ color: 'var(--primary)', fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', fontWeight: 'bold' }}>+</button>
                                </div>
                                <p style={{ fontWeight: '600', minWidth: '80px', textAlign: 'right' }}>₹{item.price * item.quantity}</p>
                            </div>
                        </div>
                    ))}

                    <textarea
                        placeholder="Any suggestions? We will pass it on..."
                        style={{
                            width: '100%',
                            marginTop: '1rem',
                            fontSize: '0.9rem',
                            padding: '1rem',
                            minHeight: '60px',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: 'white',
                            outline: 'none'
                        }}
                    ></textarea>
                </div>
            </div>

            <div className="w-mobile-100" style={{ flex: 1, minWidth: '300px' }}>
                <div className="glass" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Delivery Address</h3>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter your complete delivery address..."
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.2)',
                                minHeight: '100px',
                                resize: 'vertical',
                                fontSize: '0.95rem',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Bill Details</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>
                        <span>Item Total</span>
                        <span>₹{cartTotal}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>
                        <span>Delivery Fee</span>
                        <span>₹40</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>
                        <span>Govt Taxes & Restaurant Charges</span>
                        <span>₹{(cartTotal * 0.05).toFixed(2)}</span>
                    </div>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontWeight: '800', fontSize: '1.2rem' }}>
                        <span>To Pay</span>
                        <span>₹{(cartTotal + 40 + cartTotal * 0.05).toFixed(2)}</span>
                    </div>

                    <button onClick={handleCheckout} className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', borderRadius: '12px' }}>
                        Place Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Cart;
