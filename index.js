const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const dotenv = require("dotenv").config();
var cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const uri = process.env.MONGODB_URL;
const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

     const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks')

     )


      const verifyToken = async(req,res,next)=>{
      const authHeader = req?.headers.authorization
        if(!authHeader){
          return res.status(401).json({message: "unauthorized"  })
        }

      const token = authHeader.split(" ")[1]
      if(!token){
          return res.status(401).json({message: "unauthorized"  })
        }

        try {
           const { payload } = await jwtVerify(token, JWKS,)
           next()
           console.log(payload)
        } catch (error) {
          return res.status(401).json({message: "unauthorized"  })
        }
 
     };

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("DriveFleet");
    const carsDataInfo = db.collection("cars_info");
    const bookingCollection = db.collection("bookings");




    app.get("/cars_info", async (req, res) => {
      const result = await carsDataInfo
        .find()
        .sort({ availability_status: 1 })
        .toArray();
      res.json(result);
    });

    app.get("/cars_info/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await carsDataInfo.findOne({ _id: new ObjectId(id) });

      const booking_count = await bookingCollection.countDocuments({
        carId: id,
      });
      res.json({
        ...result,
        booking_count,
      });
    });

    app.post("/cars_info", verifyToken, async (req, res) => {
      const carListingData = req.body;

      const result = await carsDataInfo.insertOne(carListingData);

      res.json(result);
    });

    app.get("/available_cars", async (req, res) => {
      const result = await carsDataInfo
        .find({ availability_status: "Available" })
        .limit(6)
        .toArray();
      res.json(result);
    });

    // bookings api
    app.post("/bookings",verifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      res.json(result);
    });

    app.get("/bookings/:userId",verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.json(result);
    });

    // my_car_listing api
    app.get("/my_car_listing/:userId",verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await carsDataInfo.find({ userId: userId }).toArray();
      res.json(result);
      //  console.log(result)
    });
    
    app.delete("/my_car_listing/:id",verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await carsDataInfo.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
      //  console.log(result)
    });

    app.patch("/my_car_listing/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const updatedCar = req.body;
      const result = await carsDataInfo.updateOne(
        { _id: new ObjectId(id)},
        {$set:updatedCar}
    
        
         );

      res.json(result);
      //  console.log(result)
    });


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
