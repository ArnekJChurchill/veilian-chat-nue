const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");
const Pusher = require("pusher");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const usersFile = path.join(__dirname, "data/users.json");
const bannedFile = path.join(__dirname, "data/banned.json");

const pusher = new Pusher({
  appId: "2080160",
  key: "b7d05dcc13df522efbbc",
  secret: "4064ce2fc0ac5596d506",
  cluster: "us2",
  useTLS: true
});

// Avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/profilePics"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Helpers
const readJSON = file => JSON.parse(fs.readFileSync(file, "utf-8"));
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ---------- AUTH ----------
app.post("/signup", (req,res) => {
  let {username,password} = req.body;
  let users = readJSON(usersFile);
  let banned = readJSON(bannedFile);

  if (banned.includes(username)) return res.json({success:false,message:"You are banned!"});
  if (users[username]) return res.json({success:false,message:"Username already exists!"});

  users[username] = {
    username, password, avatar:"default.png", bio:"", joinDate: Date.now(), isModerator:false
  };

  // Hardcode arnekChurchill as moderator
  if(username === "@arnekChurchill" && password === "988585aw") users[username].isModerator = true;

  writeJSON(usersFile, users);
  return res.json({success:true,user:users[username]});
});

app.post("/login", (req,res) => {
  let {username,password} = req.body;
  let users = readJSON(usersFile);
  let banned = readJSON(bannedFile);

  if (banned.includes(username)) return res.json({success:false,message:"You are banned!"});
  if (!users[username] || users[username].password !== password) return res.json({success:false,message:"Invalid username/password"});

  return res.json({success:true,user:users[username]});
});

// ---------- CHAT ----------
app.post("/send-message", (req,res) => {
  let {username,message} = req.body;
  let users = readJSON(usersFile);
  if (!users[username]) return res.json({success:false});

  pusher.trigger("chat","message",{username,message,avatar:users[username].avatar});
  return res.json({success:true});
});

// ---------- PROFILE ----------
app.get("/get-user", (req,res) => {
  let username = req.query.username;
  let users = readJSON(usersFile);
  if (!users[username]) return res.json({success:false});
  return res.json({success:true,user:users[username]});
});

app.post("/update-bio", (req,res) => {
  let {username,bio} = req.body;
  let users = readJSON(usersFile);
  if (!users[username]) return res.json({success:false});
  users[username].bio = bio;
  writeJSON(usersFile, users);
  pusher.trigger("chat","update-bio",{username,bio});
  res.json({success:true});
});

app.post("/update-avatar", upload.single("avatar"), (req,res) => {
  let username = req.body.username;
  let users = readJSON(usersFile);
  if (!users[username]) return res.json({success:false});
  users[username].avatar = req.file.filename;
  writeJSON(usersFile, users);
  pusher.trigger("chat","update-avatar",{username,avatar:req.file.filename});
  res.json({success:true,filename:req.file.filename});
});

// ---------- ADMIN ----------
app.post("/ban-user", (req,res) => {
  let username = req.body.username;
  let banned = readJSON(bannedFile);
  if(!banned.includes(username)) banned.push(username);
  writeJSON(bannedFile,banned);
  res.json({success:true});
});

app.post("/unban-user", (req,res) => {
  let username = req.body.username;
  let banned = readJSON(bannedFile);
  banned = banned.filter(u=>u!==username);
  writeJSON(bannedFile,banned);
  res.json({success:true});
});

app.post("/make-moderator", (req,res) => {
  let username = req.body.username;
  let users = readJSON(usersFile);
  if (!users[username]) return res.json({success:false});
  users[username].isModerator = true;
  writeJSON(usersFile,users);
  pusher.trigger("chat","make-moderator",{username});
  res.json({success:true});
});

// ---------- START SERVER ----------
app.listen(3000,()=>console.log("Server running on http://localhost:3000"));

