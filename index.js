const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Load env variable from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u9lypro.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

    const db = client.db("parcelioDB");
    const usersCollection = db.collection("users");
    const parcelCollection = db.collection("parcels");
    const paymentsCollection = db.collection("payments");

    app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    // Parcels API
    app.get("/parcels", async (req, res) => {
      try {
        const email = req.query.email;

        // build query dynamically
        let query = {};
        if (email) {
          query = { created_by: email };
        }

        const parcels = await parcelCollection
          .find(query)
          .sort({ createdAt: -1 }) // latest first
          .toArray();

        res.send(parcels);
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });

    app.post("/parcels", async (req, res) => {
      try {
        const newParcel = req.body;
        const result = await parcelCollection.insertOne(newParcel);
        res.status(201).send(result);
      } catch (error) {
        console.log("Error inserting parcel: ", error);
        res.status(500).send({ message: "Failed to create parcel." });
      }
    });

    app.delete("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = { _id: new ObjectId(id) };

        const result = await parcelCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });

    app.get("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = { _id: new ObjectId(id) };
        const parcel = await parcelCollection.findOne(query);

        if (!parcel) {
          return res.status(404).send({ message: "Parcel not found" });
        }

        res.send(parcel);
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });

    app.get("/payments", async (req, res) => {
      try {
        const email = req.query.email;

        let query = {};
        if (email) {
          query = { email };
        }

        const payments = await paymentsCollection
          .find(query)
          .sort({ paid_at: -1 }) // latest payment first
          .toArray();

        res.send(payments);
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });


    

    app.post("/payments", async (req, res) => {
      try {
        const payment = req.body;

        // 1️⃣ Save payment history
        const paymentDoc = {parcelId, email, amount, transactionId, paymentMethod, paid_date } = req.body;


        const paymentResult = await paymentsCollection.insertOne(paymentDoc);

        // 2️⃣ Update parcel payment status
        const updateResult = await parcelCollection.updateOne(
          { _id: new ObjectId(payment.parcelId) },
          {
            $set: {
              payment_status: "paid",
              paidAt: new Date(),
            },
          }
        );

        res.send({
          message: "Payment successful",
          paymentResult,
          updateResult,
          success: true,
          insertedId: paymentResult.insertedId,
        });
      } catch (error) {
        res.status(500).send({ message: "Payment failed", error });
      }
    });

    app.post("/create-payment-intent", async (req, res) => {
      const amountInCents = req.body.amountInCents;

      try {
        // Create a PaymentIntent with the payment method ID
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (e) {
        res.json({ error: e.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
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
