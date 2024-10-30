const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwppk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});


const storage = multer.memoryStorage();
const upload = multer({ storage });

async function run() {
  try {
    await client.connect();

    // Student Details Collection
    const studentCollection = client.db('ThisisProject_Portal').collection('student_details');

    // Get all student details
    app.get('/student_details', async (req, res) => {
      const cursor = studentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get each student detail by student_id
    app.get('/student_details/:student_id', async (req, res) => {
      const studentId = req.params.student_id;
      try {
        const student = await studentCollection.findOne({ student_id: studentId });
        if (student) {
          res.send(student);
        } else {
          res.status(404).send({ message: "Student not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "Error retrieving student details", error });
      }
    });

    // Update student details by student_id 
    app.put('/student_details/:student_id', upload.single('img'), async (req, res) => {
      const studentId = req.params.student_id;
      const { name, phoneNumber, address } = req.body;

      try {
        const imgBuffer = req.file ? req.file.buffer : null;

        const updateData = {
          name,
          phoneNumber,
          address,
        };

        if (imgBuffer) {
          updateData.img = imgBuffer;
        }

        const result = await studentCollection.updateOne(
          { student_id: studentId },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Student not found' });
        }

        res.send({ message: 'Profile updated successfully', modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error updating student profile:', error);
        res.status(500).send({ message: 'Error updating profile' });
      }
    });

    // Ping MongoDB to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. Successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => res.send('Server is running'));

app.listen(port, () => console.log('Server is running on port', port));
