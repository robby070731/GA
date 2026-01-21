console.log("client");

// Koppla upp
const socket = io();

function sendMSG(msg){
    socket.emit("chat", msg);
    console.log("Client has sent a message");
}

socket.on("chat", (msg)=>{
    console.log("From server: " + msg);
    const chatBox = document.querySelector("#chatBox");
    const p = document.createElement("p");
    p.innerHTML = msg;
    chatBox.appendChild(p)
})

const chatForm = document.querySelector("#chatForm");
chatForm.addEventListener("submit", (event)=>{
    event.preventDefault();
    console.log(event.target.msg.value);
    const msg = event.target.msg.value;
    if(msg) sendMSG(msg)
})