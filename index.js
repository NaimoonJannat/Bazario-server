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
    const orderCollection = database.collection("orderCollection");
     
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

    // GET cart with full product info by user email
app.get('/users/:email/cart', async (req, res) => {
  const email = req.params.email;

  try {
    // find user
    const user = await userCollection.findOne({ email });

    if (!user || !Array.isArray(user.cart) || user.cart.length === 0) {
      return res.send([]); // return empty cart
    }

    // extract all productIds from user's cart
    const productIds = user.cart.map(item => new ObjectId(item.productId));

    // fetch product details
    const products = await productCollection
      .find({ _id: { $in: productIds } })
      .toArray();

    // attach quantity from cart
    const cartWithDetails = user.cart.map(item => {
      const product = products.find(p => p._id.toString() === item.productId);
      return {
        ...item,
        product: product || null, // include product details (null if product deleted)
      };
    });

    res.send(cartWithDetails);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).send({ success: false, message: "Server error" });
  }
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


// GET favorite by email with full product info
app.get('/favorite/:email', async (req, res) => {
  const email = req.params.email;
  try {
    let favData = await favoriteCollection.findOne({ email });

    if (!favData || !Array.isArray(favData.favProducts)) {
      favData = { favProducts: [] };
    }

    // If there are no favorite products, return empty array
    if (favData.favProducts.length === 0) {
      return res.send([]);
    }

    // Fetch full product objects for the favorite product IDs
    const objectIds = favData.favProducts.map(id => new ObjectId(id));
    const products = await productCollection
      .find({ _id: { $in: objectIds } })
      .toArray();

    // Send products array
    res.send(products);
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Server error" });
  }
});

// get orders 
  // orders 
    app.get('/orders', async (req, res) => {
      const cursor = orderCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // get orders by email 

      // GET user by email
    app.get('/orders/:email', async (req, res) => {
      const email = req.params.email;
      const order = await orderCollection.findOne({ email });
      res.send(order || {});
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

// POST - place a new order
app.post('/orders/:email', async (req, res) => {
  const email = req.params.email;
  const {
    name,
    phone,
    address,
    note,
    subtotal,
    delivery,
    orders
  } = req.body;

  try {
    const newOrder = {
      email,
      name,
      phone,
      address,
      note,
      subtotal,
      delivery,
      orderedAt: new Date(),
      status: "pending",
      orders, // array of { productId, quantity }
    };

    const result = await orderCollection.insertOne(newOrder);

    res.send({ success: true, message: "Order placed successfully", data: result });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send({ success: false, message: "Server error" });
  }
});


// All patches will be found here 
// PATCH favorite toggle (add/remove)
app.patch('/favorite/:email', async (req, res) => {
  const email = req.params.email;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).send({ success: false, message: "ProductId required" });
  }

  try {
    let favData = await favoriteCollection.findOne({ email });

    if (!favData) {
      // Create a new record if not exists
      const result = await favoriteCollection.insertOne({
        email,
        favProducts: [productId],
      });
      return res.send({ success: true, action: "added", data: result });
    }

    const isAlreadyFav = favData.favProducts.includes(productId);

    let result;
    if (isAlreadyFav) {
      // Remove
      result = await favoriteCollection.updateOne(
        { email },
        { $pull: { favProducts: productId } }
      );
      res.send({ success: true, action: "removed", data: result });
    } else {
      // Add
      result = await favoriteCollection.updateOne(
        { email },
        { $addToSet: { favProducts: productId } }
      );
      res.send({ success: true, action: "added", data: result });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Server error" });
  }
});

// PATCH - Add to Cart (add/update quantity)
app.patch('/users/:email', async (req, res) => {
  const email = req.params.email;
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return res.status(400).send({ success: false, message: "productId and quantity required" });
  }

  try {
    // Check if user exists
    const user = await userCollection.findOne({ email });
    if (!user) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    // Check if cart already has this product
    const existingItem = user.cart?.find(item => item.productId === productId);

    let result;
    if (existingItem) {
      // Update quantity if product already exists in cart
      result = await userCollection.updateOne(
        { email, "cart.productId": productId },
        { $set: { "cart.$.quantity": existingItem.quantity + quantity } }
      );
    } else {
      // Push new item to cart
      result = await userCollection.updateOne(
        { email },
        { $push: { cart: { productId, quantity } } }
      );
    }

    res.send({ success: true, message: "Cart updated successfully", data: result });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).send({ success: false, message: "Server error" });
  }
});

// PATCH - Update user profile (name, photo, address, phone)
app.patch('/users/:email/profile', async (req, res) => {
  const email = req.params.email;
  const { name, photoURL, address, phone } = req.body;

  try {
    const updateDoc = {
      $set: {
        ...(name && { name }),
        ...(photoURL && { photoURL }),
        ...(address && { address }),
        ...(phone && { phone }),
      },
    };

    const result = await userCollection.updateOne({ email }, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    res.send({ success: true, message: "Profile updated successfully", data: result });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send({ success: false, message: "Server error" });
  }
});


// All deletes will be here 

// DELETE - Remove item from Cart
app.delete('/users/:email/cart/:productId', async (req, res) => {
  const { email, productId } = req.params;

  try {
    const result = await userCollection.updateOne(
      { email },
      { $pull: { cart: { productId } } }
    );

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: "Item removed from cart" });
    } else {
      res.status(404).send({ success: false, message: "Item not found in cart" });
    }
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).send({ success: false, message: "Server error" });
  }
});

// Clear cart for a user after confirming order
app.delete("/users/:email/cart", async (req, res) => {
  try {
    const email = req.params.email;
    const result = await userCollection.updateOne(
      { email },
      { $set: { cart: [] } } 
    );

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: "Cart cleared successfully" });
    } else {
      res.send({ success: false, message: "Cart not found or already empty" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Server error" });
  }
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