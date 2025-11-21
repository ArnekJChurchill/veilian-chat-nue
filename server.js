const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Pusher = require("pusher");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

const USERS_FILE = path.join(__dirname, "data/users.json");
const BANNED_FILE = path.join(__dirname, "data/banned.json");

// --------- Pusher Setup ---------
const pusher = new Pusher({
  appId: "2080160",
  key: "b7d05dcc13df522efbbc",
  secret: "4064ce2fc0ac5596d506",
  cluster: "us2",
  useTLS: true
});

// --------- Avatar Upload ---------
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "public/uploads/profilePics");
  },
  filename: function(req, file, cb) {
    cb(null, req.body.username + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --------- Helper Functions ---------
function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readBanned() {
  return JSON.parse(fs.readFileSync(BANNED_FILE, "utf8"));
}

function writeBanned(banned) {
  fs.writeFileSync(BANNED_FILE, JSON.stringify(banned, null, 2));
}

// --------- Routes ---------

// Signup
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  if (users[username]) return res.json({ success: false, message: "Username already exists" });

  users[username] = {
    username,
    password,
    avatar: "default.png",
    bio: "",
    joinDate: Date.now(),
    isModerator: false
  };
  writeUsers(users);
  res.json({ success: true, user: users[username] });
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  const banned = readBanned();

  if (banned.includes(username)) return res.json({ success: false, message: "User is banned" });
  if (!users[username] || users[username].password !== password) return res.json({ success: false, message: "Invalid username/password" });

  res.json({ success: true, user: users[username] });
});

// Get user profile
app.get("/get-user", (req, res) => {
  const { username } = req.query;
  const users = readUsers();
  if (!users[username]) return res.json({ success: false });
  res.json({ success: true, user: users[username] });
});

// Update bio
app.post("/update-bio", (req, res) => {
  const { username, bio } = req.body;
  const users = readUsers();
  if (!users[username]) return res.json({ success: false });
  users[username].bio = bio;
  writeUsers(users);
  res.json({ success: true });
});

// Update avatar
app.post("/update-avatar", upload.single("avatar"), (req, res) => {
  const { username } = req.body;
  const users = readUsers();
  if (!users[username]) return res.json({ success: false });
  users[username].avatar = req.file.filename;
  writeUsers(users);
  res.json({ success: true, filename: req.file.filename });
});

// Send chat message
app.post("/send-message", (req, res) => {
  const { username, message } = req.body;
  const banned = readBanned();
  if (banned.includes(username)) return res.json({ success: false, message: "User is banned" });
  
  const users = readUsers();
  if (!users[username]) return res.json({ success: false });

  const data = {
    username,
    avatar: users[username].avatar,
    message
  };
  pusher.trigger("chat", "message", data);
  res.json({ success: true });
});

// Ban user
app.post("/ban-user", (req, res) => {
  const { username } = req.body;
  const banned = readBanned();
  if (!banned.includes(username)) {
    banned.push(username);
    writeBanned(banned);
  }
  res.json({ success: true });
});

// Unban user
app.post("/unban-user", (req, res) => {
  const { username } = req.body;
  let banned = readBanned();
  banned = banned.filter(u => u !== username);
  writeBanned(banned);
  res.json({ success: true });
});

// Make Moderator
app.post("/make-moderator", (req, res) => {
  const { username, adminPassword } = req.body;
  if (adminPassword !== "988585aw") return res.json({ success: false, message: "Invalid admin password" });
  
  const users = readUsers();
  if (!users[username]) return res.json({ success: false, message: "User not found" });
  users[username].isModerator = true;
  writeUsers(users);
  res.json({ success: true });
});

// Start server
app.listen(3000, () => {
  console.log("Veilian Chat running on http://localhost:3000");
});
