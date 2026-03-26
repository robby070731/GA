console.log("client");

// Koppla upp
const socket = io();

const commentForm = document.querySelector("#commentForm");
if(commentForm){
    commentForm.addEventListener("submit", (event)=>{
        event.preventDefault();
        const comment = event.target.comment.value;
        console.log(comment);
        if(comment){
            event.target.comment.value = "";
            sendComment(comment);
        }
    })
}

function sendComment(comment){
    if(typeof comment !== "string" || comment.length > 100) return;
    socket.emit("comment", comment, gameId);
    console.log("Client has sent a message");
}

function commentEdit(event){
    let commentId = event.target.parentElement.parentElement.id;
    let content = event.target.parentElement.parentElement.children[0].children[1];
    let original = content.innerText;
    content.setAttribute("contenteditable", true);
    content.focus();
    content.addEventListener("keyup" ,(event)=>{
        let commentValue = event.target.innerText.trim();
        if(event.keyCode == 13){
            console.log(commentValue);
            socket.emit("editComment", commentValue, commentId, gameId);
        }
    content.addEventListener("focusout", ()=>{
        console.log("Focus Lost");
        console.log(original);
        content.innerText = original;
    })
    })
}

function commentDelete(event){
    if(window.confirm("Are you sure?")){
        console.log("Okidoki");
        let commentId = event.target.parentElement.parentElement.id;
        socket.emit("deleteComment", commentId, gameId);
    }
}

socket.on("comment", (comment)=>{
    console.log("From server: " + comment);
    const commentsDiv = document.querySelector("#comments");
    commentsDiv.insertAdjacentHTML("beforeend", comment);
})

socket.on("editComment", (NewP, commentId)=>{
    console.log("Great Success");
    console.log(NewP);
    let comment = document.getElementById(commentId).children[0];
    comment.children[1].remove();
    comment.insertAdjacentHTML("beforeend", NewP);
})

socket.on("deleteComment", (commentId)=>{
    document.getElementById(commentId).remove();
})

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