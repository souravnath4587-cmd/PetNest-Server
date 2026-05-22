const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const app = express();

const uri =
  "mongodb+srv://pet-nest:bKBik1iLP91mwjvW@cluster0.l69kqn7.mongodb.net/?appName=Cluster0";
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

const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

const varifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "unauthorize." });
  }
  const token = authHeader.split(" ")[1];
  console.log(token);

  if (!token) {
    return res.status(401).json({ message: "unauthorize." });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({ message: "jwt is not working..." });
  }
};

// const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

// const verifyToken = async (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   const token = authHeader.split(" ")[1];
//   console.log(token);

//   if (!authHeader) {
//     return res.status(401).json({ message: "unauthorize" });
//   }

//   if (!token) {
//     return res.status(401).json({ message: "unauthorize" });
//   }
//   try {
//     const { payload } = await jwtVerify(token, JWKS);
//     console.log(payload);
//     next();
//   } catch (error) {
//     return res.status(403).json({ message: "Forbidden" });
//   }
// };

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("petNest");
    const petCollection = db.collection("allPets");
    const adoptCollection = db.collection("adoptPet");
    // const myListingCollection = db.collection("myListing");

    // Search and sortBySpecies :
    app.get("/all-pets", async (req, res) => {
      const search = req.query.search || "";
      const speciesData = req.query.sortBySpecies || "";

      const query = {
        $and: [
          {
            $or: [
              { PetName: { $regex: search, $options: "i" } },
              { breed: { $regex: search, $options: "i" } },
            ],
          },
          ...(speciesData
            ? [{ species: { $regex: speciesData, $options: "i" } }]
            : []),
        ],
      };

      const result = await petCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/all-pets/:id", async (req, res) => {
      const { id } = req.params;
      const query = {
        _id: id,
      };
      const result = await petCollection.deleteOne(query);
      res.json(result);
    });

    app.patch("/my-request/:id", async (req, res) => {
      const { id } = req.params;
      const updatedStatusFromAdopt = req.body;
      const filter = { petId: id };
      console.log(filter);
      const updatedDoc = {
        $set: updatedStatusFromAdopt,
      };
      const result = await adoptCollection.updateOne(filter, updatedDoc);
      res.json(result);
    });

    // status changing of all-pets document:
    app.patch("/all-pets/:id", async (req, res) => {
      const { id } = req.params;
      const updatedStatus = req.body;
      console.log(id, updatedStatus);

      const filter = { _id: id };
      const updatedDoc = {
        $set: updatedStatus,
      };
      const result = await petCollection.updateOne(filter, updatedDoc);
      res.json(result);
    });

    // update my-pets collection add adopt data.
    app.patch("/my-pets/:id", async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      console.log(updateData);
      const result = await petCollection.updateOne(
        {
          _id: id,
        },
        { $set: updateData },
      );
      res.json(result);
    });

    // app.get("/my-listing", async (req, res) => {
    //   const result = await myListingCollection.find().toArray();
    //   res.json(result);
    // });

    // app.post("/my-listing", async (req, res) => {
    //   const myListingData = req.body;
    //   console.log(myListingData);
    //   const result = await myListingCollection.insertOne(myListingData);
    //   res.json();
    // });

    app.delete("/my-request/:id", async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          message: "Invalid ID",
        });
      }
      const result = await adoptCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    app.get("/feature", async (req, res) => {
      const result = await petCollection.find().limit(6).toArray();
      res.json(result);
    });

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

    app.get("/all-pets/:id", varifyToken, async (req, res) => {
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
