const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, Collection } = require('mongodb');
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.VITE_USER}:${process.env.VITE_PASS}@cluster0.qcus7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const marathonsCollection =client.db('MilesAhead').collection('Marathons')
    const upcomingCollection = client.db('MilesAhead').collection('upcoming-event')

    app.get('/marathons',async(req,res)=>{
        const result =await marathonsCollection.find().limit(6).toArray()
        res.send(result)
    })

    app.get('/upcoming-event',async(req,res)=>{
      const result = await upcomingCollection.find().toArray()
      res.send(result)
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send('MilesAhead is running')
})

app.listen(port,()=>{
    console.log('MilesAhead is running on port',port)
})