require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// middleware

const corsOptions = {
  origin: [`http://localhost:5173`],
  credentials: true,
  optionalSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nugjc.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) return res.status(401).send({ message: "unAuthorize access" });
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unAuthorize access" });
    }
    req.user = decoded;
  });
  next();
};

async function run() {
  try {
    await client.connect();
    console.log("mongodb connected");
    const database = client.db("volunteer_DB");
    const volunteerCollection = database.collection("volunteer");
    const requestCollection = database.collection("request");

    app.get("/", async (req, res) => {
      res.send("server is running");
    });

    // jwt
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    // logout
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    //
    app.patch("/volunteers/decrease/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $inc: { volunteersNeeded: -1 } };
      const result = await volunteerCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/volunteers/requested", async (req, res) => {
      const { email, postId } = req.query;

      const existing = await requestCollection.findOne({
        volunteerEmail: email,
        volunteerPostId: postId,
      });

      res.send({ requested: !!existing });
    });

    // get volunteers requests made by the logged in user
    app.get("/my-volunteer-requests", verifyToken, async (req, res) => {
      const userEmail = req.query.email;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== userEmail) {
        return res.status(400).send({ message: "not valid" });
      }
      if (!userEmail) {
        return res.status(400).send({ message: "email is required" });
      }
      const result = await requestCollection
        .find({ volunteerEmail: userEmail })
        .toArray();
      res.send(result);
    });

    // deleted volunteer requested
    app.delete("/volunteers/request/:id", async (req, res) => {
      const id = req.params.id;
      const result = await requestCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    //
    app.post("/volunteers/request", async (req, res) => {
      const { volunteerEmail, volunteerPostId } = req.body;

      const existing = await requestCollection.findOne({
        volunteerEmail,
        volunteerPostId,
      });

      if (existing) {
        return res
          .status(400)
          .send({ message: "You have already requested for this post." });
      }

      const requestData = req.body;
      const result = await requestCollection.insertOne(requestData);
      res.send(result);
    });
    // add volunteer
    app.post("/add_volunteer", async (req, res) => {
      const volunteerData = req.body;
      const result = await volunteerCollection.insertOne(volunteerData);
      res.send(result);
    });

    // update

    app.put("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const updatedPost = req.body;
      {
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            thumbnail: updatedPost.thumbnail,
            title: updatedPost.title,
            description: updatedPost.description,
            category: updatedPost.category,
            location: updatedPost.location,
            volunteersNeeded: updatedPost.volunteersNeeded,
            deadline: updatedPost.deadline,
            organizerName: updatedPost.organizerName,
            organizerEmail: updatedPost.organizerEmail,
          },
        };
        const result = await volunteerCollection.updateOne(filter, updateDoc);

        res.send(result);
      }
    });

    // delete data
    app.delete("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const result = await volunteerCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    // get specific volunteer data
    app.get("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerCollection.findOne(query);
      res.send(result);
    });

    // get volunteer pots added by the logged in user
    app.get("/my-volunteer-posts", verifyToken, async (req, res) => {
      const userEmail = req.query.email;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== userEmail) {
        return res.status(400).send({ message: "not valid" });
      }
      if (!userEmail) {
        return res.status(400).send({ message: "email is required" });
      }
      if (!userEmail) {
        return res.status(400).send({ message: "email is required" });
      }
      const result = await volunteerCollection
        .find({ organizerEmail: userEmail })
        .toArray();
      res.send(result);
    });
    // get all volunteer
    app.get("/volunteer", async (req, res) => {
      const result = await volunteerCollection.find().toArray();
      res.send(result);
    });

    app.listen(port, () => {
      console.log(`running on the port: ${port}`);
    });
  } catch (error) {
    console.log("Mongodb connected error");
  }
}
run();
