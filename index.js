const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require('mongodb');

// Load env variable from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u9lypro.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("parcelioDB");
    const usersCollection = db.collection("users");
    const parcelCollection = db.collection("parcels");

     app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

     app.get("/parcels", async (req, res) => {
      const users = await parcelCollection.find().toArray();
      res.send(users);
    });

    app.post("/parcels", async(req, res) => {
        try{
            const newParcel = req.body;
            const result = await parcelCollection.insertOne(newParcel);
            res.status(201).send(result);

        }
        catch(error){
            console.log("Error inserting parcel: ", error);
            res.status(500).send({message: 'Failed to create parcel.'})
        }
    })






















    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);












// root route
app.get("/", (req, res) => {
  res.send("Parcelio Server is running 🚀");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});