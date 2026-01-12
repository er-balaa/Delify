
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for dev
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');

// Middleware
app.use(cors());
app.use(express.json());

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log('📊 Database Host:', mongoose.connection.host); // Verifies Atlas connection
  })
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

// Routes
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);

const path = require('path');

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Delify API is running');
  });
}

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('join_user_room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start Server
// Start Server
const startServer = () => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  }).on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
      console.error(`👉 You have another instance of the server running.`);
      console.error(`   Please CLOSE other terminal windows or stop the process first.\n`);
      process.exit(1);
    } else {
      console.error(e);
    }
  });
};

startServer();

