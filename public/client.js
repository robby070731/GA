console.log("client");

// Koppla upp
const socket = io();

function sendComment(comment){
    socket.emit("comment", comment);
    console.log("Client has sent a message");
}

socket.on("comment", (comment)=>{
    console.log("From server: " + comment);
    const commentsDiv = document.querySelector("#comments");
    commentsDiv.insertAdjacentHTML("beforeend", comment);
})

const commentForm = document.querySelector("#commentForm");
commentForm.addEventListener("submit", (event)=>{
    event.preventDefault();
    console.log(event.target.comment.value);
    const comment = event.target.comment.value;
    if(comment) sendComment(comment)
})