const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const {
  MongoClient,
  ServerApiVersion,
  Collection,
  ObjectId,
} = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// cors configuration
const corsConfig = {
  origin : ['http://localhost:5173','https://milesahead-34c38.web.app'],
  credentials : true,
  optionalSuccessStatus : 200
}

app.use(cors(corsConfig));
app.use(express.json());
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.VITE_USER}:${process.env.VITE_PASS}@cluster0.qcus7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token middleWare

const verifyToken=(req,res,next)=>{
  const token = req.cookies?.token
  if(!token){
    return res.status(401).send({message : 'Unauthorize Access'})
  }
  
  jwt.verify(token,process.env.VITE_USER_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message : 'Unauthorize Access'})
    }
    req.user = decoded;
    next()
  })
}

async function run() {
  try {
    // await client.connect();

    const marathonsCollection = client.db("MilesAhead").collection("Marathons");
    const applyMarathonsCollection = client
      .db("MilesAhead")
      .collection("Apply-marathons");
    const upcomingCollection = client
      .db("MilesAhead")
      .collection("upcoming-event");

    // jwt-post-route
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      // create token
      const token = jwt.sign(user,process.env.VITE_USER_SECRET,{expiresIn : '1d'})

      // set cookie and send response
      res 
      .cookie('token',token,{
        httpOnly :true,
        secure : process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV ==='production' ? 'none' : 'strict'
      })
      .send({success : true})
    })

    //jwt clear cookie get route
    app.get('/clearCookie',(req,res)=>{
      res.clearCookie('token',{
        maxAge :0,
        secure : process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV ==='production' ? 'none' : 'strict'
      }).send({success :true})
    })

    // post-new-marathon
    app.post("/add-marathon", async (req, res) => {
      const marathonData = req.body;
      const result = await marathonsCollection.insertOne(marathonData);
      res.send(result);
    });

    // post-applies-marathons
    app.post("/apply-marathons", async (req, res) => {
      const data = req.body;
      // retriever id and email for query
      const id = data.jobId;
      const applicantEmail = data.email;

      const filter = { jobId: id, email: applicantEmail };
      const existingApplication = await applyMarathonsCollection.findOne(
        filter
      );
      // existing registration validation
      if (existingApplication) {
        return res
          .status(400)
          .send("You Can't Re Apply On the Applied Marathon");
      }

      const result = await applyMarathonsCollection.insertOne(data);

      const query = { _id: new ObjectId(id) };
      const increaseRegCount = {
        $inc: {
          registrationCount: 1,
        },
      };
      const updatedRegCount = await marathonsCollection.updateOne(
        query,
        increaseRegCount
      );
      res.send(result);
    });

    // update-marathon
    app.patch("/update-marathon/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const marathon = req.body;
      const updatedMarathon = {
        $set: {
          title: marathon.title,
          registrationStart: marathon.registrationStart,
          registrationEnd: marathon.registrationEnd,
          marathonStart: marathon.marathonStart,
          location: marathon.location,
          distance: marathon.distance,
          description: marathon.description,
          image: marathon.image,
          createAt: marathon.createAt,
          registrationCount: marathon.registrationCount,
        },
      };
      const result = await marathonsCollection.updateOne(
        query,
        updatedMarathon
      );
      res.send(result);
    });

    // update-marathon
    app.patch("/update-apply/marathon/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const marathon = req.body;
      const updatedMarathon = {
        $set: {
          fname: marathon.fname,
          lname: marathon.lname,
          number: marathon.number,
        },
      };
      const result = await applyMarathonsCollection.updateOne(
        query,
        updatedMarathon
      );
      res.send(result);
    });

    // delete-marathon
    app.delete("/delete/my-marathon/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await marathonsCollection.deleteOne(filter);
      res.send(result);
    });
    // delete-registration
    app.delete("/delete/my-registration/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await applyMarathonsCollection.deleteOne(filter);
      res.send(result);
    });

    // get-six-marathon/all marathon
    app.get("/marathons", async (req, res) => {
      const allMarathons = req.query.allMarathons;
      const createDate = req.query.createDate
      const register = req.query.registerDate

      // page and itemPerPage for pagination
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size)

      if (allMarathons) {
        let sortQuery 
        if(createDate){
          sortQuery={createAt : -1}
        }
        else if(register){
          sortQuery = {
            registrationStart: -1}
        }

        const allData = await marathonsCollection.find()
        .skip(page * size)
        .limit(size)
        .sort(sortQuery).toArray();
        return res.send(allData);
      } 
      
      // for home page limit
      else {
        const result = await marathonsCollection.find().limit(6).toArray();
        res.send(result);
      }
    });

    // total data estimatedCount for pagination
    app.get('/pagination', async(req,res)=>{
      const result =await marathonsCollection.estimatedDocumentCount()
      res.send({result})
    })

    // get-upcoming-marathon
    app.get("/upcoming-event", async (req, res) => {
      const result = await upcomingCollection.find().toArray();
      res.send(result);
    });

    // get-marathon-details
    app.get("/marathons/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonsCollection.findOne(query);
      res.send(result);
    });

    // get-creator-marathons
    app.get("/my-marathons/:email",verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email
      if(decodedEmail !== email){
        return res.status(403).send({message : 'Forbidden Access'})
      }
      const query = { creatorEmail: email };
      const result = await marathonsCollection.find(query).toArray();
      res.send(result);
    });

    // get-applied-marathons
    app.get("/my-applied/marathons/:email",verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email
      if(decodedEmail !== email){
        return res.status(403).send({message : 'Forbidden Access'})
      }
      const search = req.query.search;
      let query = { email: email };
      if (search && search.trim()) {
        query.title = {
          $regex: search,
          $options: "i",
        };
      }
      const result = await applyMarathonsCollection.find(query).toArray();
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("MilesAhead is running");
});

app.listen(port, () => {
  console.log("MilesAhead is running on port", port);
});
