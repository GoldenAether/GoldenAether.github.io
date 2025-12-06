(() => {
  const canvas = document.createElement("canvas");
  canvas.id = "galaxy-canvas";
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "-1000",
    pointerEvents: "none",
    backgroundColor: "#000",
  });
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  let w, h;
  const starCount = 150; // reduced from 250 for performance
  let stars = [];

  const random = (min, max) => Math.random() * (max - min) + min;

  function createStars() {
    stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: random(0, w),
        y: random(0, h),
        radius: random(0.3, 1.2),
        alpha: random(0.1, 0.8),
        vx: random(-0.1, 0.1),
        vy: random(-0.1, 0.1),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: random(0.001, 0.003),
      });
    }
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    createStars();
  }

  function updateStars() {
    const now = performance.now();
    for (const star of stars) {
      star.alpha += star.twinkleSpeed * Math.sin(now * 0.005 + star.twinklePhase);
      star.alpha = Math.min(Math.max(star.alpha, 0.1), 0.8);

      star.x += star.vx;
      star.y += star.vy;

      if (star.x < 0 || star.x > w) star.vx *= -1;
      if (star.y < 0 || star.y > h) star.vy *= -1;
    }
  }

  function drawNebula() {
    const gradient = ctx.createRadialGradient(w * 0.3, h * 0.7, 100, w * 0.5, h * 0.3, 700);
    const time = performance.now() * 0.0001;
    const hueShift = (Math.sin(time) + 1) * 180;

    gradient.addColorStop(0, `hsla(${hueShift}, 80%, 30%, 0.15)`);
    gradient.addColorStop(0.5, `hsla(${(hueShift + 60) % 360}, 70%, 20%, 0.12)`);
    gradient.addColorStop(1, `hsla(${(hueShift + 120) % 360}, 50%, 10%, 0.08)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  function drawStars() {
    ctx.clearRect(0, 0, w, h);
    drawNebula();

    for (const star of stars) {
      const grd = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 5);
      grd.addColorStop(0, `rgba(255, 255, 255, ${star.alpha})`);
      grd.addColorStop(0.4, `rgba(255, 255, 255, ${star.alpha * 0.3})`);
      grd.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function animate() {
    updateStars();
    drawStars();
    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  resize();
  animate();
})();

var harmonyVer = "1.0.0"

const wsUri = "ws://74.197.196.228:8080/";
const output = document.getElementById("output");
const websocket = new WebSocket(wsUri);

var clientName = "Cosmos"

var unreads = 0

var username = getCookie("usrnam")

if (username == "" || username == "null"){
  username = prompt("Please enter a username to use Cosmos (This can be changed with refresh but you will lose your chat history)")
  document.cookie = "usrnam=" + username
}

var connected = false;
let pingInterval;

function writeToScreen(message) {
  var json = JSON.parse(message);
  var div = document.createElement("div");

if (json.username == "&&HarmonyServer") {
  div.className = "servMsgCont";
  var smsg = document.createElement("p");
  smsg.className = "smsg";
  smsg.innerText = json.message;
  div.appendChild(smsg);
} else {
  div.className = "message";

  // Add sent or received class for bubble direction
  if (json.username === username) {
    div.classList.add("sent");
  } else {
    div.classList.add("received");
  }
  
  var puser = document.createElement("p");
  puser.className = "username";
  puser.innerText = "" + json.username + "";
  div.appendChild(puser);

  var pmsg = document.createElement("p");
  pmsg.className = "message-content";
  var final = stylizeText(escapeHtml(json.message));

  pmsg.innerHTML = final;
  div.appendChild(pmsg);

  // Notification sound & push
  if (json.username != username) {
    new Notification(json.username, { body: json.message });
    const pinger = document.getElementById("pinger");
    pinger.pause();
    pinger.currentTime = 0;
    pinger.play();
  }
}


  var date = new Date(json.date);
  div.title = date.toLocaleTimeString("en-US");

  var scroll = false;
  if (
    Math.round(output.scrollTop) !==
      output.scrollHeight - output.offsetHeight &&
    !document.hasFocus()
  ) {
    div.id = "unread";
    unreads += 1;
    document.getElementById("title").innerText = `(${unreads}) ${clientName}`;
    document.getElementById("notifBanner").innerText = `${unreads} unread messages.`;
    document.getElementById("notifBanner").style = "visibility: visible;";
  } else {
    scroll = true;
  }

  output.appendChild(div);
  if (scroll) {
    output.scroll({
      top: 1000000,
      left: 0,
      behavior: "smooth",
    });
  }
}


function stylizeText(text){
  var t = text.split(" ")
  var arr = []
  for (let i = 0; i < t.length; i++) {
    const element = t[i];
    var final = element
    // <e:http://example.com/>
    if (element.includes("&lt;e:")){
      console.log(element)
      var url = element.replace("&lt;e:", "").replace("&gt;", "")
      final = `<img class="emoji" src=${url}>`
    }
    // <img:http://example.com>
    if (element.includes("&lt;img:")){
      console.log(element)
      var url = element.replace("&lt;img:", "").replace("&gt;", "")
      final = `<img class="full" src=${url}>`
    }
    arr.push(final)
  }
  var fin = arr.join(' ')
  return fin
}

function testForRead(){
  if (Math.round(output.scrollTop) === (output.scrollHeight - output.offsetHeight)){
    // const elm = document.getElementsByClassName("unread")
    // for (let i = 0; i < elm.length; i++) {
    //   const element = elm[i];
    //   element.className.replace(" unread", "")
    // }
    while (document.getElementById("unread")) {
      document.getElementById("unread").id = ""
    }
    
    unreads = 0
    document.getElementById("title").innerText = `${clientName}`
    document.getElementById("notifBanner").style = "visibility: hidden;"
  }
}

setInterval(testForRead, 500)

function sendMessage(message) {
  var msg = JSON.stringify({
    message: `${message}`, 
    username: `${username}`
  })
  websocket.send(msg);
}

const escapeHtml = unsafe => {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

websocket.onopen = (e) => {
  websocket.send("&&j-" + username);
  connected = true
}

websocket.onclose = (e) => {
  var joinmsg = {
    username: "&&HarmonyServer", 
    message: "STARS HAVE FALLEN"
  }
  writeToScreen(JSON.stringify(joinmsg))
  connected = false;
};

websocket.onmessage = (e) => {
  writeToScreen(`${e.data}`);
};

websocket.onerror = (e) => {
  var msg = {
    username: "&&HarmonyServer", 
    message: `STARS HAVE FALLEN (${e.data})`
  }
  writeToScreen(`${msg}`);
};

function send(){
  sendMessage(document.getElementById("msg-box").value)
  document.getElementById("msg-box").value = ""

  if (Notification.permission === "default"){
    // Notification.requestPermission()
  }
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
        }
    }
    return "";
}

function popup_info(){
  var popup = window.open("./info.html", "_blank", {"popup": true})
}

document.body.addEventListener("keyup", (e) => {
  if (e.key == "Enter") {
    send()
  }
})
