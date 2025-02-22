require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


// middle Wire
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xlwti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const userCollection = client.db('TaskHiveDB').collection('users')
        const taskCollection = client.db('TaskHiveDB').collection('tasks')




        // user related apis
        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const existUser = await userCollection.findOne(query)
            if (existUser) {
                return res.send({ message: 'user already exist', insertedId: null })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })


        // Task related api
        app.post('/tasks', async (req, res) => {
            const task = req.body
            const result = await taskCollection.insertOne(task)
            res.send(result)
        })

        app.get('/tasks', async (req, res) => {
            const email = req.query.email

            const result = await taskCollection.aggregate([
                {
                    "$match": { "email": email }
                },
                {
                    "$facet": {
                        "ToDo": [
                            { "$match": { "category": "To-Do" } },
                            { "$group": { "_id": "To-Do", "tasks": { "$push": "$$ROOT" } } }
                        ],
                        "InProgress": [
                            { "$match": { "category": "In-Progress" } },
                            { "$group": { "_id": "In-Progress", "tasks": { "$push": "$$ROOT" } } }
                        ],
                        "Done": [
                            { "$match": { "category": "Done" } },
                            { "$group": { "_id": "Done", "tasks": { "$push": "$$ROOT" } } }
                        ]
                    }
                },
                {
                    "$project": {
                        "categories": {
                            "$concatArrays": [
                                "$ToDo",
                                "$InProgress",
                                "$Done"
                            ]
                        }
                    }
                }
            ]).toArray()
            res.send(result)
        })


        app.delete('/tasks/:id', async ( req, res)=>{
            const id = req.params.id
            const query = { _id : new ObjectId(id) }
            const result = await taskCollection.deleteOne(query)
            res.send(result)
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



app.get('/', (req, res) => {
    res.send('TaskHive server is running!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})