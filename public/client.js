// Koppla upp
const socket = io();

// Kollar om komment formulär finns och lägger i sådana fall på funktionalitet
const commentForm = document.querySelector("#commentForm");
if(commentForm){
    commentForm.addEventListener("submit", (event)=>{
        // Förhindrar sidan från att ladda om
        event.preventDefault();

        const comment = event.target.comment.value;
        if(comment){
            // Tömmer formuläret och skickar innehållet
            event.target.comment.value = "";
            sendComment(comment);
        }
    })
}

function sendComment(comment){
    // Kollar om kommentaren är giltig och skickar isådanafall den till servern
    if(typeof comment !== "string" || comment.length > 100) return;
    socket.emit("comment", comment, gameId);
}

// Funktion för att hantera ändringar av kommentarer
function commentEdit(event){
    // Plockar ut kommentarens data
    let commentId = event.target.parentElement.parentElement.id;
    let content = event.target.parentElement.parentElement.children[0].children[1];
    let original = content.innerText;

    // Gör så att man kan ändra texten i kommentaren och fokuserar på den (samma som om du klickat in på den manuellt)
    content.setAttribute("contenteditable", true);
    content.focus();

    // lägger till en eventlistener och kollar för enter(enter = keycode 13) och skickar isådanafall iväg den uppdaterade kommentaren till servern
    content.addEventListener("keyup" ,(event)=>{
        let commentValue = event.target.innerText.trim();
        if(event.keyCode == 13){
            socket.emit("editComment", commentValue, commentId, gameId);
        }

    // Om du går ut från textrutan så återställs värdet
    content.addEventListener("focusout", ()=>{
        content.innerText = original;
    })
    })
}

// Funktion för att radera kommentarer
function commentDelete(event){
    // Popup för att undvika raderingar av misstag och skickar sedan vidare till servern 
    if(window.confirm("Are you sure?")){
        let commentId = event.target.parentElement.parentElement.id;
        socket.emit("deleteComment", commentId, gameId);
    }
}

// Tar emot escapade kommentarer från servern och placerar dem på sidan
socket.on("comment", (comment)=>{
    const commentsDiv = document.querySelector("#comments");
    commentsDiv.insertAdjacentHTML("beforeend", comment);
})

// Tar emot ändrade kommentarer som escapad html och ersätter den gamla på sidan
socket.on("editComment", (NewP, commentId)=>{
    let comment = document.getElementById(commentId).children[0];
    comment.children[1].remove();
    comment.insertAdjacentHTML("beforeend", NewP);
})

// Tar emot kommentar id från servern och tar bort den från sidan
socket.on("deleteComment", (commentId)=>{
    document.getElementById(commentId).remove();
})

// Event listener för när sidan laddar
window.addEventListener("load",()=>{
    // Tar url:en och manipulerar den för att ta reda på om du är på homepage och kollar om du fått med något felmeddelande
    let url = window.location.href.split("?");
    if(url[0] !== "http://localhost:3456/"){
        document.querySelector("main").style.display = "block";
        document.querySelector("#menuDiv").style.display = "none";
    }

    // Kallar en popup alert om du fått med ett fel
    if(url[1].includes("error")){
        let error = url[1].split("=");
        alert(error[1].replaceAll("%20", " "));
    }
})

// Konfirmation för att ta bort spel
function confirmDelete(gameId){
    if(window.confirm("Are you sure?")){
        window.location.replace(`/delete?gameId=${gameId}`);
    }
}

// Sökfunktion till homepage
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