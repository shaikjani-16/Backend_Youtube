import connectDb from "./db/index.js";
import dotenv from "dotenv";
import { app } from "./app.js";
dotenv.config({
  path: "./.env",
});
app.use((err, req, res, next) => {
  // Handle errors here
  console.error(err.stack);
  res.status(500).send("Something broke!");
});
connectDb()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log("Server is running on port 3000");
    });
  })
  .catch((e) => console.log("Mongo URL" + e));
