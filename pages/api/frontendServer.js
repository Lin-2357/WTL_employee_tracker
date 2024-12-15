const express = require('express');
const bodyParser = require('body-parser');
const myGenerate = require('./mygenerate'); // Adjust path if necessary
const myInterpret = require('./generate');
const myPopulate = require('./generate2');
require('dotenv').config();
const IP = process.env.CHESS_IP_ADDRESS;

const app = express();
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

PORT = 4000;

app.post('/backup', async (req, res) => {
  try {
    const generateInput = req.body.prompt; // Extract prompt from request body
    const query = await myGenerate({animal: generateInput}); 
    console.log(query)
    res.json(query);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate', async (req, res) => {
  try {
    const generateInput = req.body.prompt; // Extract prompt from request body
    const session = req.body.session;
    const user_id = req.body.user_id;

    // Call the local function from mygenerate.js
    const result = await fetch('http://'+IP+':8010/generate', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          prompt: generateInput,
          session_id: session,
          user_id: user_id
      })
  });
    // Send the result back to the client
    if (result.status === 200) {
      const query = await result.json();
      console.log(query)
      res.json(query);
    } else if (result.status === 400) {
      res.status(400).json({error: "session expired"})
    }else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/interpret', async (req, res) => {
  try {

    // Call the local function from mygenerate.js
    const result = await myInterpret(req.body);

    // Send the result back to the client
    if (result['result']) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/populate', async (req, res) => {
  try {

    // Call the local function from mygenerate.js
    const result = await myPopulate(req.body);
    // Send the result back to the client
    res.json(result)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/sendback', async (req, res) => {
  fetch('http://'+IP+':8010/generate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body)
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.export = app;



