const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const app = express();

const uri =
  "mongodb+srv://pet-nest:QklDNB7dhDN7zLcD@cluster0.l69kqn7.mongodb.net/?appName=Cluster0";
app.use(cors());
app.use(express.json());

const PORT = 5000;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("petNest");
    const petCollection = db.collection("allPets");
    const adoptCollection = db.collection("adoptPet");

    app.get("/my-request", async (req, res) => {
      const result = await adoptCollection.find().toArray();
      res.json(result);
    });

    app.post("/all-pets/:id", async (req, res) => {
      const adoptData = req.body;
      console.log(adoptData);
      const result = await adoptCollection.insertOne(adoptData);
      res.json(result);
    });

    app.get("/all-pets/:id", async (req, res) => {
      const { id } = req.params;

      let query;
      if (ObjectId.isValid(id)) {
        query = {
          $or: [{ _id: id }, { _id: new ObjectId(id) }],
        };
      } else {
        query = {
          _id: id,
        };
      }

      const result = await petCollection.findOne(query);
      res.json(result);
    });

    app.post("/all-pets", async (req, res) => {
      const petData = req.body;
      console.log(petData);
      const result = await petCollection.insertOne(petData);
      res.json(result);
    });

    // All Pet information get on this..
    app.get("/all-pets", async (req, res) => {
      const result = await petCollection.find().toArray();
      res.json(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("The Pet server is connected...");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
