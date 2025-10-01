const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();

// Enable CORS for FCC testing
app.use(cors({ optionsSuccessStatus: 200 }));

// Parse POST form data
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files from 'public'
app.use(express.static("public"));

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// MongoDB connection
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not defined in environment variables");
  process.exit(1);
}
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db("url_shortener");
    const urls = db.collection("urls");

    // POST endpoint to shorten URLs
    app.post("/api/shorturl", async (req, res) => {
      const originalUrl = req.body.url;

      // Validate URL format
      const urlRegex = /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/;
      if (!urlRegex.test(originalUrl)) {
        return res.json({ error: "invalid url" });
      }

      try {
        // Check if URL already exists
        const existingUrl = await urls.findOne({ original_url: originalUrl });
        if (existingUrl) {
          return res.json({
            original_url: existingUrl.original_url,
            short_url: existingUrl.short_url,
          });
        }

        // Get the next short_url number
        const count = await urls.countDocuments();
        const newShortUrl = count + 1;

        // Save the new URL
        await urls.insertOne({
          original_url: originalUrl,
          short_url: newShortUrl,
        });

        res.json({
          original_url: originalUrl,
          short_url: newShortUrl,
        });
      } catch (err) {
        console.error("Error in POST /api/shorturl:", err);
        res.status(500).json({ error: "Server error" });
      }
    });

    // GET endpoint to redirect short URLs
    app.get("/api/shorturl/:short_url", async (req, res) => {
      const shortUrl = parseInt(req.params.short_url);

      try {
        const urlDoc = await urls.findOne({ short_url: shortUrl });
        if (urlDoc) {
          // Ensure the URL has a protocol
          let redirectUrl = urlDoc.original_url;
          if (
            !redirectUrl.startsWith("http://") &&
            !redirectUrl.startsWith("https://")
          ) {
            redirectUrl = "https://" + redirectUrl;
          }
          return res.redirect(redirectUrl);
        } else {
          res.status(404).json({ error: "No short URL found" });
        }
      } catch (err) {
        console.error("Error in GET /api/shorturl:", err);
        res.status(500).json({ error: "Server error" });
      }
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

run().catch(console.dir);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});