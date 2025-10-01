const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
require("dotenv").config();

const app = express();

// Enable CORS for testing
app.use(cors({ optionsSuccessStatus: 200 }));

// Parse POST form data
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files from public
app.use(express.static('public'));

// Serve index.html
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('url_shortener');
    const urls = db.collection('urls');

    // POST endpoint to create a short URL
    app.post('api/shorturl', async (req, res) => {
      const originalUrl = req.body.url;

      // Validate URL format
      const urlRegex =
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      if (!urlRegex.test(originalUrl)) {
        return res.json({ error: 'invalid url' });
      };

      try {
        // Check if URL already exists
        const existingUrl = await urls.findOne({ original_url:
          originalUrl });
        if (existingUrl) {
          return res.json({
            original_url: existingUrl.original_url,
            short_url: existingUrl.short_url
          });
        }

        // Get the next short_url number
        const count = await urls.countDocuments();
        const newShortUrl = count + 1;

        // Save the new URL
        await urls.insertOne({
          original_url: originalUrl,
          short_url: newShortUrl
        });

        res.json({
          original_url: originalUrl,
          short_url: newShortUrl
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
      }
    });

    // GET endpoint to redirect to original URLs
    app.get('/api/shorturl/:short_url', async (req, res) => {
      const shortUrl = parseInt(req.params.sort_url);

      try {
        const urlDoc = await urls.findOne({ short_url:
        shortUrl });
        if (urlDoc) {
          return res.redirect(urlDoc.original_url);
        } else {
          res.status(404).json({ error: 'No short URL found'});
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
      }
    });

  } catch (err) {
    console.error('MongoDB connection error: ', err);
  }
}

run().catch(console.dir);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});
