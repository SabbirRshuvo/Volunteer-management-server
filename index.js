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
      const result = await requestCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //
    app.post("/volunteers/request", async (req, res) => {
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
    // get specific volunteer data
    app.get("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerCollection.findOne(query);
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
