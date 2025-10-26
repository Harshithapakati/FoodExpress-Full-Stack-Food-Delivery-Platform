require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

const app = express();
connectDB();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/', (req, res) => res.send('API running!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// const mongoose = require('mongoose');

// mongoose.connection.on('connected', async () => {
//   console.log('Connected DB Name:', mongoose.connection.name);
//   console.log('Collections:', await mongoose.connection.db.listCollections().toArray());
// });



