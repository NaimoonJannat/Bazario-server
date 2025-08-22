const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
  }));
  app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3ywizof.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


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
    //   await client.connect();

     const database = client.db('bazarioDb');

    //  Collections List 
    const userCollection = database.collection("userCollection");
    const productCollection = database.collection("productCollection");
    const favoriteCollection = database.collection("favoriteCollection");
     
    // All the GET requests 

    // user 
    app.get('/users', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

     // GET user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      res.send(user || {});
    });

    // products
    app.get('/products', async (req, res) => {
      const cursor = productCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // Product details
    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await productCollection.findOne(query);
      res.send(result);
    })

    // Favorite list
    app.get('/favorite', async (req, res) => {
      const cursor = favoriteCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // GET favorite by email
app.get('/favorite/:email', async (req, res) => {
  const email = req.params.email;
  const userFav = await favoriteCollection.findOne({ email });
  res.send(userFav || {});
});


    // All the Post requests 
      // to send users backend 
    app.post('/users', async (req, res) => {
      const newUser = req.body;
     const email = newUser?.email;
if (!email) {
  return res.status(400).send({ message: 'Email is required' });
}
const existing = await userCollection.findOne({ email });


  if (existing) {
    return res.status(409).send({ message: 'User already exists' });
  }
      console.log(newUser);
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    })

    // send new products backend 
    app.post('/products', async (req, res) => {
        const newProduct = req.body;
        console.log(newProduct);
        const result = await productCollection.insertOne(newProduct);
        res.send(result);
      })

    // POST - create new favorite record
app.post('/favorite', async (req, res) => {
  const { email, favProducts } = req.body;

  if (!email || !favProducts) {
    return res.status(400).send({ success: false, message: "Email and favProducts required" });
  }

  const existing = await favoriteCollection.findOne({ email });
  if (existing) {
    return res.status(409).send({ success: false, message: "User already exists in favorites" });
  }

  const result = await favoriteCollection.insertOne({ email, favProducts });
  res.send({ success: true, data: result });
});

// PATCH - update (push new productId into favProducts array)
app.patch('/favorite/:email', async (req, res) => {
  const email = req.params.email;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).send({ success: false, message: "ProductId required" });
  }

  const result = await favoriteCollection.updateOne(
    { email },
    { $addToSet: { favProducts: productId } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).send({ success: false, message: "User not found" });
  }

  res.send({ success: true, message: "Favorite updated", data: result });
});



    

     } finally {
        // Ensures that the client will close when you finish/error
      //   await client.close();
      }

    }

    run().catch(console.log);


  app.get('/', (req, res) => {
    res.send('Bazario Server is Running')
  })
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })