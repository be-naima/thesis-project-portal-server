const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { ObjectId } = require('mongodb');
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

    // Instructor Details Collection
    const instructorCollection = client.db('ThisisProject_Portal').collection('instructor_details');

    // Thesis Details Collection

    const thesisCollection = client.db('ThisisProject_Portal').collection('thesis_details');



    ///Student 
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


    ////Instructor
    // Get all instructor details
    app.get('/instructor_details', async (req, res) => {
      const cursor = instructorCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // Get each instructor detail by _id
    app.get('/instructor_details/:_id', async (req, res) => {
      const instructorId = req.params._id;
      try {
        const instructor = await instructorCollection.findOne({ _id: new ObjectId(instructorId) });
        if (instructor) {
          res.send(instructor);
        } else {
          res.status(404).send({ message: "instructor not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "Error retrieving instructor details", error });
      }
    });

    // Update instructor details by _id
    app.put('/instructor_details/:_id', upload.single('img'), async (req, res) => {
      const instructorId = new ObjectId(req.params._id);
      const { name, phone, email } = req.body;

      try {
        const imgBuffer = req.file ? req.file.buffer : null;

        const updateData = {
          name,
          phone,
          email,
        };

        if (imgBuffer) {
          updateData.img = imgBuffer;
        }

        const result = await instructorCollection.updateOne(
          { _id: instructorId },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Instructor not found' });
        }

        res.send({ message: 'Profile updated successfully', modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error updating instructor profile:', error);
        res.status(500).send({ message: 'Error updating profile' });
      }
    });
    //pushing selectedSupervisor id to database
    app.put('/student_details/:student_id/select-supervisor', async (req, res) => {
      const studentId = req.params.student_id;
      const { supervisorId } = req.body;

      try {
        // Add supervisorId to the selected_supervisors array
        const result = await studentCollection.updateOne(
          { student_id: studentId },
          { $addToSet: { selected_supervisors: supervisorId } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: 'Student not found or supervisor already selected.' });
        }

        // Return the updated student details
        const updatedStudent = await studentCollection.findOne({ student_id: studentId });
        res.json(updatedStudent); // Send back the updated student data with selected_supervisors
      } catch (error) {
        console.error('Error selecting supervisor:', error);
        res.status(500).json({ message: 'Error selecting supervisor' });
      }
    });


    //add team member
    app.post('/add-member', async (req, res) => {
      const { email, email2, ownerId } = req.body;
      console.log(email2)

      // student details by email 
      const student = await studentCollection.findOne({ email: email });
      const student2 = await studentCollection.findOne({ email: email2 });

      const adminStudent = await studentCollection.findOne({ student_id: ownerId });
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }


      const team = await thesisCollection.findOne({ id: ownerId });

      if (!team) {

        const teamCount = await thesisCollection.countDocuments();
        const newTeamId = `T${teamCount + 1}`;

        const studentIds = [adminStudent.student_id, student.student_id];
        const studentNames = [adminStudent.name, student.name];

        if (student2?.student_id) {
          studentIds.push(student2.student_id);
          studentNames.push(student2.name)
        }
        await thesisCollection.insertOne({

          team: newTeamId,
          title: null,
          abstract: null,
          student_ids: studentIds,
          student_name: studentNames,
          supervisor: null,
          defence: null,
          completed: false,
          type: null,
          dept: null,
          year_of_Completion: null,
          area_of_research: null,
          proposal_board: null,
          proposal_date: null,
          proposal_status: null,
          pre_defense_board: null,
          pre_defense_date: null,
          pre_defense_status: null,
          defense_board: null,
          defense_date: null,
          defense_status: null,
        });
        return res.json({ message: 'Team created and student added successfully', student_id: student.student_id });
      }

      const updateResult = await thesisCollection.updateOne(
        { id: ownerId },
        {
          $addToSet: {
            student_ids: student.student_id,
            student_name: student.name,
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        res.json({ message: 'Student added successfully', student_id: student.student_id });
      } else {
        res.status(400).json({ message: 'Failed to add student or student already exists in the team' });
      }
    });



    //remove team member
    app.delete('/remove-member', async (req, res) => {
      const { team, memberId, index } = req.body;
      console.log(team, memberId, index);

      try {

        const teamDocument = await thesisCollection.findOne({ team: team });

        if (!teamDocument) {
          return res.status(404).json({ message: "Team not found." });
        }


        const updateResult = await thesisCollection.updateOne(
          { team: team },
          {
            $pull: { student_ids: memberId }
          }
        );

        if (updateResult.modifiedCount > 0) {

          if (teamDocument.student_name && index >= 0 && index < teamDocument.student_name.length) {
            teamDocument.student_name.splice(index, 1);


            await thesisCollection.updateOne(
              { team: team },
              { $set: { student_name: teamDocument.student_name } }
            );
          }

          res.json({ message: "Member removed successfully." });
        } else {
          res.status(400).json({ message: "Member not found or already removed." });
        }
      } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ message: "Error removing member." });
      }
    });



    //find each student_id thesis details 
    app.get('/thesis_details/:studentId', async (req, res) => {
      const { studentId } = req.params;

      try {

        const cursor = thesisCollection.find({ student_ids: studentId });
        const result = await cursor.toArray();

        if (result.length > 0) {
          res.send(result);
        } else {
          res.status(404).json({ message: 'No thesis data found for this student ID.' });
        }
      } catch (error) {
        console.error("Error fetching thesis data:", error);
        res.status(500).json({ message: "Error fetching thesis data." });
      }
    });

    //admin login



    app.post('/admin_details', async (req, res) => {
      const { email, password } = req.body;

      try {
        const admin = await client.db('ThisisProject_Portal').collection('admin_details').findOne({ email, password });
        console.log(admin);
        if (admin) {
          res.json({ isAdmin: true });
        } else {
          res.json({ isAdmin: false });
        }
      } catch (error) {
        console.error("Error checking admin login:", error);
        res.status(500).json({ error: "Server error" });
      }
    });

    //admin is assigning supervisor

    app.patch('/student_details/:student_id/assign-supervisor', async (req, res) => {
      const studentId = req.params.student_id;
      const { assignedSupervisor } = req.body;
  
      try {
          const result = await studentCollection.updateOne(
              { student_id: studentId },
              { $set: { assignedSupervisor } }
          );
  
          if (result.matchedCount === 0) {
              return res.status(404).send({ message: 'Student not found' });
          }
  
          res.send({ message: 'Supervisor assigned successfully' });
      } catch (error) {
          res.status(500).send({ message: 'Error assigning supervisor', error });
      }
  });
  
  // Deduct supervisor availability
  app.patch('/instructor_details/:_id', async (req, res) => {
      const instructorId = req.params._id;
      const { availability } = req.body;
  
      try {
        
          const result = await instructorCollection.updateOne(
              { _id: instructorId},
              { $set: { availability } }
          );
  
          if (result.matchedCount === 0) {
              return res.status(404).send({ message: 'Instructor not found' });
          }
  
          res.send({ message: 'Availability updated successfully' });
      } catch (error) {
          res.status(500).send({ message: 'Error updating availability', error });
      }
  });



    // Ping MongoDB to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => res.send('Server is running'));

app.listen(port, () => console.log('Server is running on port', port));
