console.log("client");

// Koppla upp
const socket = io();

function sendComment(comment){
    socket.emit("comment", comment, gameId);
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
    const comment = event.target.comment.value;
    console.log(comment);
    if(comment) sendComment(comment)
})