import mongoose from 'mongoose';
import dns from 'dns';

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('MongoDB connection error: MONGO_URI is not defined in server/.env');
    process.exit(1);
  }

  if (uri.startsWith('mongodb+srv://')) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }

  try {
    await mongoose.connect(uri);

    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error(
      'Please verify your MongoDB URI and network connectivity. If you are using MongoDB Atlas, make sure the SRV host is reachable and your IP is whitelisted.'
    );
    process.exit(1);
  }
};

export default connectDB;
