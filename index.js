const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { ObjectId } = require('mongodb');
// Middleware
app.use(cors());
app.use(express.json());
app.use("/files", express.static("files"));


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwppk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

/////////////////////////////////////////////////////////////////////////////////////////////


// Directory where files should be stored on disk
const filesDir = "./files"; // Update this path as needed

// Memory storage - files are stored in memory as Buffer objects
const memoryStorage = multer.memoryStorage();

// Disk storage - files are saved to the specified directory
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, filesDir); // Store files in 'files' directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Add a timestamp to the original file name
  }
});

// Define multer instances using the different storage types
const upload = multer({ storage: memoryStorage });
const upload2 = multer({ storage: diskStorage });

//////////////////////////////////////////////////////////////////////////////////////////////

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

    //// Update Proposal Status and Feedback
    app.put('/update_proposal/:team', async (req, res) => {
      const { team } = req.params;
      const { proposal_status, proposal_feedback_sup } = req.body;
      console.log('Team:', team);
      console.log('Received proposal_status and feedback:', proposal_status, proposal_feedback_sup);

      try {

        const result = await thesisCollection.updateOne(
          { team: team },
          {
            $set: {
              proposal_status: proposal_status || undefined,
              proposal_feedback_sup: proposal_feedback_sup || undefined
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Thesis not found' });
        }

        res.status(200).json({ message: 'Thesis updated successfully' });
      } catch (error) {
        console.error('Error updating thesis:', error);
        res.status(500).json({ message: 'Error updating thesis', error });
      }
    });
    //// Update Pre Defence Status and Feedback
    app.put('/update_pre_defense/:team', async (req, res) => {
      const { team } = req.params;
      const { pre_defense_status, pre_defense_feedback_sup } = req.body;

      try {

        const result = await thesisCollection.updateOne(
          { team: team },
          {
            $set: {
              pre_defense_status: pre_defense_status || undefined,
              pre_defense_feedback_sup: pre_defense_feedback_sup || undefined
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Thesis not found' });
        }

        res.status(200).json({ message: 'Thesis updated successfully' });
      } catch (error) {
        console.error('Error updating thesis:', error);
        res.status(500).json({ message: 'Error updating thesis', error });
      }
    });
    //// Update  Defence Status and Feedback
    app.put('/update_defense/:team', async (req, res) => {
      const { team } = req.params;
      const { defense_status, defence_feedback_sup } = req.body;

      try {

        const result = await thesisCollection.updateOne(
          { team: team },
          {
            $set: {
              defense_status: defense_status || undefined,
              defence_feedback_sup: defence_feedback_sup || undefined
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Thesis not found' });
        }

        res.status(200).json({ message: 'Thesis updated successfully' });
      } catch (error) {
        console.error('Error updating thesis:', error);
        res.status(500).json({ message: 'Error updating thesis', error });
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
          proposal: null,
          pre_defence: null,
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
          proposal_feedback_sup: null,
          pre_defense_feedback_sup: null,
          defence_feedback_sup: null

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

    //All thesis details

    app.get('/all_thesis', async (req, res) => {
      const cursor = thesisCollection.find();
      const result = await cursor.toArray();
      res.send(result);
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

    //find each team thesis details 
    app.get('/proposal_submission/:team', async (req, res) => {
      const { team } = req.params;
      console.log(team)
      try {

        const cursor = thesisCollection.find({ team: team });
        const result = await cursor.toArray();

        if (result.length > 0) {
          res.send(result);
        } else {
          res.status(404).json({ message: 'No team found.' });
        }
      } catch (error) {
        console.error("Error fetching thesis data:", error);
        res.status(500).json({ message: "Error fetching thesis data." });
      }
    });


    // Route to submit proposal
    app.post('/submit_proposal', upload2.single('pdfFile'), async (req, res) => {
      const { teamName, type, title, abstract, areaOfResearch } = req.body;
      await thesisCollection.updateOne(
        { team: teamName },
        { $set: { proposal_status: "Pending" } }
    );
      // Ensure the file is uploaded
      const pdfFilePath = req.file ? req.file.path : null;
      if (!pdfFilePath) {
        return res.status(400).json({ error: 'Please upload a valid PDF file.' });
      }

      try {
        // Check if the team exists in the database
        const existingTeam = await thesisCollection.findOne({ team: teamName });
        if (!existingTeam) {
          return res.status(404).json({ error: 'Team does not exist.' });
        }

        // Prepare updated proposal details
        const updatedTeam = {
          title: title || existingTeam.title,
          abstract: abstract || existingTeam.abstract,
          area_of_research: areaOfResearch || existingTeam.area_of_research,
          proposal: pdfFilePath,
          type: type || existingTeam.type,
          completed: false,
        };

        // Update team details with the new proposal
        const result = await thesisCollection.updateOne(
          { team: teamName },
          { $set: updatedTeam }
        );

        return res.status(200).json({ message: 'Proposal updated successfully', result });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error submitting or updating proposal' });
      }
    });

    // Retrieve Proposal PDF File Route
    app.get('/proposal/:filename', (req, res) => {
      const { filename } = req.params;
      const filePath = `${filesDir}/${filename}`;

      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }

      // Set header and send the file
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath, { root: '.' });
    });


    // Route to submit pre-defense PDF
    app.post('/submit_pre_defence', upload2.single('pdfFile'), async (req, res) => {
      const { team } = req.body;
      const pdfFilePath = req.file ? req.file.path : null;
      await thesisCollection.updateOne(
        { team: team },
        { $set: { pre_defense_status: "Pending" } }
    );

      if (!pdfFilePath) {
        return res.status(400).json({ error: 'Please upload a valid PDF file.' });
      }

      try {
        // Check if the team exists in the database
        const existingTeam = await thesisCollection.findOne({ team });
        if (!existingTeam) {
          return res.status(404).json({ error: 'Team does not exist.' });
        }

        const result = await thesisCollection.updateOne(
          { team },
          { $set: { pre_defence: req.file.filename } }
        );

        if (result.modifiedCount > 0) {
          return res.status(200).json({ message: 'Report submitted successfully' });
        } else {
          return res.status(400).json({ error: 'Failed to update the pre_defence field' });
        }
      } catch (error) {
        console.error('Error submitting pre-defense report:', error);
        res.status(500).json({ error: 'Error submitting or updating Report' });
      }
    });

    // Route to submit defense PDF
    app.post('/submit_defence', upload2.single('pdfFile'), async (req, res) => {
      const { team } = req.body;
      const pdfFilePath = req.file ? req.file.path : null;
      await thesisCollection.updateOne(
        { team: team },
        { $set: { defense_status: "Pending" } }
    );
      if (!pdfFilePath) {
        return res.status(400).json({ error: 'Please upload a valid PDF file.' });
      }

      try {
        // Check if the team exists in the database
        const existingTeam = await thesisCollection.findOne({ team });
        if (!existingTeam) {
          return res.status(404).json({ error: 'Team does not exist.' });
        }

        const result = await thesisCollection.updateOne(
          { team },
          { $set: { defence: req.file.filename } }
        );

        if (result.modifiedCount > 0) {
          return res.status(200).json({ message: 'Report submitted successfully' });
        } else {
          return res.status(400).json({ error: 'Failed to update the defence field' });
        }
      } catch (error) {
        console.error('Error submitting defense report:', error);
        res.status(500).json({ error: 'Error submitting or updating Report' });
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
