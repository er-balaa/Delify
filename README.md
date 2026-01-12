# Delify - Food Delivery App

A full-stack food delivery application built with the MERN stack (MongoDB, Express, React, Node.js) and Firebase Authentication.

## Key Features & Uniqueness

-   **🚀 Real-Time Vendor Dashboard**: Powered by **Socket.IO**, restaurant owners receive instant audio and visual alerts for new orders without refreshing the page.
-   **👨‍🍳 Granular Order Control**: Unlike standard apps, Owners have full control to mark items 'Out of Stock', update status to 'Preparing/Delivered', and set custom **Estimated Delivery Times**.
-   **🔐 Role-Based Security**: Seamless integration between Firebase Auth and MongoDB ensures secure, automatic access control for **Admins**, **Restaurant Owners**, and **Customers**.
-   **✨ Premium Glassmorphism UI**: A visually stunning interface featuring modern glass effects, gradient accents, and smooth **Framer Motion** animations.
-   **📱 Fully Mobile Responsive**: A complex dashboard experience optimized for mobile, allowing restaurant owners to manage their business from anywhere.

## Setup Instructions

### Prerequisites
- Node.js installed
- MongoDB Atlas Account (Connection String)
- Firebase Project (Config details)

### 1. Backend Setup

1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment Variables:
    - Edit `server/.env` and update `MONGO_URI` with your actual MongoDB connection string.

4.  Start the server:
    ```bash
    npm run start
    # Runs on http://localhost:5000
    ```

### 2. Frontend Setup

1.  Navigate to the `client` directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Firebase:
    - Create a `.env` file in `client/` based on your Firebase project settings:
      ```
      VITE_FIREBASE_API_KEY=your_api_key
      VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
      VITE_FIREBASE_PROJECT_ID=your_project_id
      VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
      VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
      VITE_FIREBASE_APP_ID=your_app_id
      ```
4.  Start the React app:
    ```bash
    npm run dev
    # Runs on http://localhost:5173
    ```

## Project Structure

-   **client/**: React Frontend (Vite)
    -   `src/components`: Reusable UI components (Navbar, RestaurantCard)
    -   `src/pages`: Main application pages (Home, Login, RestaurantDetail, Cart)
    -   `src/contexts`: React Context for Auth and Cart management
-   **server/**: Express Backend
    -   `models/`: Mongoose Schemas (User, Restaurant, MenuItem, Order)
    -   `routes/`: API Endpoints

## Notes

-   The application currently uses some dummy data for Restaurants/Menus to ensure immediate visual feedback even without a populated database.
-   Uncomment the API calls in `Home.jsx`, `RestaurantList.jsx`, and `RestaurantDetail.jsx` once the database is seeded.


Email: delifyadmin@gmail.com
Password: admin123delify#


kfcowner@gmail.com
kfcdelify


