require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// middleware
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nugjc.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

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
    app.get("/my-volunteer-requests", async (req, res) => {
      const userEmail = req.query.email;
      if (!userEmail) {
        return res.status(400).send({ message: "email is required" });
      }
      const result = await requestCollection
        .find({ volunteerEmail: userEmail })
        .toArray();
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
    app.get("/my-volunteer-posts", async (req, res) => {
      const userEmail = req.query.email;
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
