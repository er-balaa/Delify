const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Order = require('./models/Order');
const User = require('./models/User'); // Required for refs
const Restaurant = require('./models/Restaurant'); // Required for refs

dotenv.config({ path: 'server/.env' });

console.log("⏳ Connecting to MongoDB Atlas for Order Deletion Test...");

if (!process.env.MONGO_URI) { console.error("❌ MONGO_URI not found!"); process.exit(1); }

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to Atlas.');

        // 1. Create a dummy order
        console.log("creating dummy order...");
        // We need valid IDs for user/rest otherwise validation might fail if checking existence, 
        // but schema just checks type ObjectId usually unless logic enforces it.
        // The Order schema refs 'User' and 'Restaurant'.

        const dummyId = new mongoose.Types.ObjectId();

        const testOrder = new Order({
            user: dummyId,
            restaurant: dummyId,
            items: [{
                // menuItem: dummyId, // Optional in schema? Let's check. Schema says menuItem type ObjectId.
                price: 100,
                quantity: 1
            }],
            totalAmount: 100,
            deliveryAddress: "Test Delete Address",
            status: "placed"
        });

        const savedOrder = await testOrder.save();
        console.log(`\n🎉 CREATE SUCCESS: Created Order ID: ${savedOrder._id}`);

        // 2. Delete it
        console.log(`\n🗑️ Attempting to delete Order ID: ${savedOrder._id}...`);
        const deletedOrder = await Order.findByIdAndDelete(savedOrder._id);

        if (deletedOrder) {
            console.log(`✅ DELETE SUCCESS: Order document was removed.`);
        } else {
            console.error(`❌ DELETE FAILED: Order not found directly after creation.`);
        }

        // 3. Verify it's gone
        const check = await Order.findById(savedOrder._id);
        if (!check) {
            console.log("re-verification: Order is definitely gone.");
        } else {
            console.error("re-verification: Order STILL EXISTS.");
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ ERROR:', err);
        process.exit(1);
    });
