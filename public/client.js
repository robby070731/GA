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
if(commentForm){
    commentForm.addEventListener("submit", (event)=>{
        event.preventDefault();
        const comment = event.target.comment.value;
        console.log(comment);
        if(comment) sendComment(comment);
    })
}
window.addEventListener("load",()=>{
    let url = window.location.href.split("?");
    console.log(url[0]);
    if(url[0] !== "http://localhost:3456/"){
        console.log("Simon suger på minecraft");
        document.querySelector("main").style.display = "block";
    }
})

function confirmDelete(gameId){
    if(window.confirm("Are you sure?")){
        console.log("Okidoki");
        window.location.replace(`/delete?gameId=${gameId}`);
    }
}