console.log("client");

// Koppla upp
const socket = io();

function sendComment(comment){
    if(comment.length > 100) return
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
        document.querySelector("#menuDiv").style.display = "none";
    }
    if(url[1].includes("error")){
        console.log(url[1]);
        let error = url[1].split("=");
        console.log(error[1]);
        alert(error[1].replaceAll("%20", " "));
    }
})

function confirmDelete(gameId){
    if(window.confirm("Are you sure?")){
        console.log("Okidoki");
        window.location.replace(`/delete?gameId=${gameId}`);
    }
}

function searchFun(){
    var searchText = document.querySelector("#search").value.toLowerCase();
    const gameDivs = document.querySelectorAll(".games");
    for (let div of gameDivs){
        div.classList.add("hidden");
        let h2 = div.querySelector("h2");
        let text = h2.textContent.toLowerCase();
        if(text.includes(searchText)){
            div.classList.remove("hidden");
        }
    }
}

function commentEdit(event){
    console.log("edit")
    console.log(event.target)
}

function commentDelete(){
    console.log("delete")
}