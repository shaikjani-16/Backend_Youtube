import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
const connectDb = async () => {
  try {
    const connectionDB = await mongoose.connect(
      `${process.env.MONGO_URL}/${DB_NAME}`
    );
    console.log(`Connected to MongoDB ${connectionDB.connection.host}`);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};
export default connectDb;
