require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.VITE_STRIPE_SECRET)

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://milesahead-34c38.web.app"],
    credentials: true,
    optionalSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.VITE_USER}:${process.env.VITE_PASS}@cluster0.qcus7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// nodeMailer-function
const sendEmail =async (emailAddress) => {
  const transporter = nodemailer.createTransport(
    {
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.VITE_SENDER_EMAIL,
      pass: process.env.VITE_SENDER_PASS,
    },
  }
);
  // mail-transporter
  // transporter.verify((error, success) => {
  //   if (error) {
  //     console.error("Error verifying transporter:", error);
  //   } else {
  //     console.log("Transporter success -->", success);
  //   }
  // });

  // email-body
  const mailBody = {
    from: process.env.VITE_SENDER_EMAIL, // sender address
    to: emailAddress, // list of receivers
    subject: "WeLcome To MilesAhead Club", // Subject line
    html: `
    <p>
      Welcome to MilesAhead We're excited to have you onboard—stay tuned for exclusive updates, offers, and more!
      </p>`,
  
};

try{
  const info = await transporter.sendMail(mailBody)
  if (process.env.NODE_ENV === 'development') {
    console.log("Email sent successfully:", info.response);  }
}
catch(err){
  if (process.env.NODE_ENV === 'development') {
    console.log('email error -->',err)
  }
}
}

// verify token middleWare
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorize Access" });
  }

  jwt.verify(token, process.env.VITE_USER_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorize Access" });
    }
    req.user = decoded;
    next();
  });
};

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

      const subscriptionCollection = client.db("MilesAhead").collection("subscriptions");

    // jwt-post-route
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // create token
      const token = jwt.sign(user, process.env.VITE_USER_SECRET, {
        expiresIn: "1d",
      });

      // set cookie and send response
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // payment-route
    app.post('/create-paymentIntent', async(req,res)=>{
      const {amount} = req.body;
      if(!amount || amount === '0' ){
        return
      }
      const  amountNumber  = parseInt(amount * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amountNumber,
        currency : "usd",
        payment_method_types: ["card"],
      })

      res.send({
        clientSecret :paymentIntent.client_secret
      })
    })

    //jwt clear cookie get route
    app.post("/clearCookie", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // post-new-marathon
    app.post("/add-marathon", verifyToken, async (req, res) => {
      const marathonData = req.body;
      const result = await marathonsCollection.insertOne(marathonData);
      res.send(result);
    });

    // post-applies-marathons
    app.post("/apply-marathons", verifyToken, async (req, res) => {
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
    app.patch("/update-marathon/:id", verifyToken, async (req, res) => {
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
    app.patch("/update-apply/marathon/:id", verifyToken, async (req, res) => {
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
    app.delete("/delete/my-marathon/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await marathonsCollection.deleteOne(filter);
      res.send(result);
    });
    // delete-registration
    app.delete("/delete/my-registration/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await applyMarathonsCollection.deleteOne(filter);
      res.send(result);
    });

    // get-six-marathon/all marathon
    app.get("/marathons", async (req, res) => {
      const allMarathons = req.query.allMarathons;
      const createDate = req.query.createDate;
      const register = req.query.registerDate;

      // page and itemPerPage for pagination
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);

      if (allMarathons) {
        let sortQuery;
        if (createDate) {
          sortQuery = { createAt: -1 };
        } else if (register) {
          sortQuery = {
            registrationStart: -1,
          };
        }

        const allData = await marathonsCollection
          .find()
          .skip(page * size)
          .limit(size)
          .sort(sortQuery)
          .toArray();
        return res.send(allData);
      }

      // for home page limit
      else {
        const result = await marathonsCollection.find().limit(6).toArray();
        res.send(result);
      }
    });

    // total data estimatedCount for pagination
    app.get("/pagination", async (req, res) => {
      const result = await marathonsCollection.estimatedDocumentCount();
      res.send({ result });
    });

    // get-upcoming-marathon
    app.get("/upcoming-event", async (req, res) => {
      const result = await upcomingCollection.find().toArray();
      res.send(result);
    });

    // get-marathon-details
    app.get("/marathons/details/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonsCollection.findOne(query);
      res.send(result);
    });

    // get-creator-marathons
    app.get("/my-marathons/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { creatorEmail: email };
      const result = await marathonsCollection.find(query).toArray();
      res.send(result);
    });

    // get-applied-marathons
    app.get("/my-applied/marathons/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
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

    // user-subscription-post-route
    app.post('/user-subscription',async(req,res)=>{
      const subscription = req.body;
      const email = subscription?.email;
      const isExistingEmail = await subscriptionCollection.findOne({email})
      if(isExistingEmail){
        return res.status(422).send({message : 'Email Already Exist'})
      }
      const result = await subscriptionCollection.insertOne(subscription)
      if(result.insertedId){
        sendEmail(email)
      }
      res.send(result)
    })

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
  if (process.env.NODE_ENV === 'development') {
    console.log("MilesAhead is running on port", port);  }
});
