let currentUser = null;

// --------- Pusher Setup ---------
const pusher = new Pusher("b7d05dcc13df522efbbc", { cluster: "us2" });
const channel = pusher.subscribe("chat");
channel.bind("message", data => addMessageToUI(data));

// --------- Login/Signup ---------
async function signup() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  if (!username || !password) return showError("Fill both username and password");

  const res = await fetch("/signup", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success) loginUser(data.user);
  else showError(data.message);
}

async function login() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  if (!username || !password) return showError("Fill both username and password");

  const res = await fetch("/login", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success) loginUser(data.user);
  else showError(data.message);
}

function showError(msg) { document.getElementById("error-msg").innerText = msg; }

// --------- Login Success ---------
function loginUser(user) {
  currentUser = user;
  document.getElementById("loginScreen").style.display="none";
  document.getElementById("chatScreen").style.display="flex";
  document.getElementById("userDisplay").innerText = user.username;
  document.getElementById("userAvatar").src = "/uploads/profilePics/" + user.avatar;
  if (user.isModerator || user.username === "@arnekChurchill") document.getElementById("adminPanel").style.display="flex";
}

// --------- Chat ---------
async function sendMessage() {
  const message = document.getElementById("chatMessage").value.trim();
  if (!message) return;
  const res = await fetch("/send-message", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ username: currentUser.username, message })
  });
  const data = await res.json();
  if (data.success) document.getElementById("chatMessage").value = "";
}

function addMessageToUI({username, avatar, message}) {
  const messages = document.getElementById("messages");
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.innerHTML = `<img src="/uploads/profilePics/${avatar}"><span class="username" onclick="openProfile('${username}')">${username}</span>: <span class="msg-text">${message}</span>`;
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

// --------- Profile ---------
async function openProfile(username) {
  const res = await fetch(`/get-user?username=${username}`);
  const data = await res.json();
  if (!data.success) return;
  const profile = data.user;

  document.getElementById("profileUsername").innerText = profile.username;
  document.getElementById("profileAvatar").src = "/uploads/profilePics/" + profile.avatar;
  document.getElementById("profileBio").value = profile.bio || "";
  document.getElementById("profileJoinDate").innerText = "Joined: " + new Date(profile.joinDate).toLocaleDateString();

  if (username === currentUser.username) {
    document.getElementById("editButtons").style.display = "block";
    document.getElementById("profileBio").readOnly = true;
  } else {
    document.getElementById("editButtons").style.display = "none";
    document.getElementById("profileBio").readOnly = true;
  }

  document.getElementById("profilePage").style.display = "flex";
}

function closeProfile() { document.getElementById("profilePage").style.display="none"; }

function editBio() {
  document.getElementById("profileBio").readOnly=false;
  document.getElementById("saveBioBtn").style.display="inline";
}

async function saveBio() {
  const bio = document.getElementById("profileBio").value;
  const res = await fetch("/update-bio", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ username: currentUser.username, bio })
  });
  const data = await res.json();
  if (data.success) {
    document.getElementById("profileBio").readOnly = true;
    document.getElementById("saveBioBtn").style.display="none";
  }
}

// --------- Avatar Upload ---------
function uploadAvatar() { document.getElementById("avatarInput").click(); }
async function submitAvatar(event) {
  const file = event.target.files[0];
  const formData = new FormData();
  formData.append("avatar", file);
  formData.append("username", currentUser.username);
  const res = await fetch("/update-avatar", { method:"POST", body:formData });
  const data = await res.json();
  if (data.success) {
    document.getElementById("profileAvatar").src="/uploads/profilePics/"+data.filename;
    document.getElementById("userAvatar").src="/uploads/profilePics/"+data.filename;
  }
}

// --------- Admin ---------
async function banUser() {
  const username = document.getElementById("banUserInput").value.trim();
  if (!username) return;
  await fetch("/ban-user", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ username }) });
  alert(username+" banned!");
}

async function unbanUser() {
  const username = document.getElementById("banUserInput").value.trim();
  if (!username) return;
  await fetch("/unban-user", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ username }) });
  alert(username+" unbanned!");
}

async function makeModerator() {
  const username = document.getElementById("banUserInput").value.trim();
  const adminPassword = document.getElementById("adminPassword").value;
  if (!username || !adminPassword) return alert("Fill username and admin password");
  const res = await fetch("/make-moderator", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ username, adminPassword }) });
  const data = await res.json();
  if (data.success) alert(username+" is now a moderator");
  else alert(data.message);
}
