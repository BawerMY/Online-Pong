const socket = io("/");

document.getElementById("create-game-button").addEventListener("click", e => {
    socket.emit("create-game");
})

document.getElementById("join-game-button").addEventListener("click", e => {
    socket.emit("join-game", document.getElementById("game-id-input").value);
})

socket.on("game-created", gameId => {
    document.getElementById("create-game-menu").style.display = "block"
    document.getElementById("game-id").innerText = gameId;
    document.getElementById("main-menu").style.display = "none";
})

socket.on("game-not-found", () => {
    alert("game not found")
})

socket.on("waiting-for-the-host-to-start-the-game", () => {
    document.getElementById("join-game-menu").style.display = "flex"
    document.getElementById("main-menu").style.display = "none";
})

socket.on("waiting-for-you-to-start-the-game", () => {
    document.getElementById("start-button").disabled = false
})

Array.from(document.getElementsByClassName("exit-button")).forEach((button) => {
    button.addEventListener("click", () => {
        socket.emit("exit-lobby")
        document.getElementById("join-game-menu").style.display = "none"
        document.getElementById("create-game-menu").style.display = "none"
        document.getElementById("main-menu").style.display = "flex";
    })
})

socket.on("game-not-full", () => {
    document.getElementById("start-button").disabled = true;
})

document.getElementById("start-button").addEventListener("click", e => {
    socket.emit("game-start")
    document.getElementById("create-game-menu").style.display = "none"
    document.getElementById("score-table").style.display = "block"
    document.getElementById("score-table").innerText = "0-0"
    document.getElementById("exit").style.display = "block"
    document.getElementById("game-canvas").style.display = "block"
})

socket.on("game-start", () => {
    document.getElementById("join-game-menu").style.display = "none";
    document.getElementById("score-table").style.display = "block"
    document.getElementById("score-table").innerText = "0-0"
    document.getElementById("exit").style.display = "block"
    document.getElementById("game-canvas").style.display = "block"
})

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

let positions = {
    left: 250,
    right: 250,
    ball: {
        x: 500,
        y: 250
    }
}

let score = {
    p1: 0,
    p2: 0
}

playerWidth = 33;
playerHeight = 100;
ballRadius = 10

function updateCanvas() {
    ctx.beginPath()
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(1000 - playerWidth, positions.right-playerHeight/2, playerWidth, playerHeight);
    ctx.fillRect(0, positions.left-playerHeight/2, playerWidth, playerHeight);
    ctx.arc(positions.ball.x, positions.ball.y, ballRadius, 0, Math.PI * 2, false)
    ctx.fill()
    ctx.closePath()
}

socket.on("game", data => {
    positions.left = data.firstPlayerY
    positions.right = data.secondPlayerY
    positions.ball = data.ballPosition
    updateCanvas()
    socket.emit("input", {
        pressingW: pressingW,
        pressingS: pressingS,
    })
})

socket.on('score', score => {
    document.getElementById("score-table").innerText = `${score.p1}-${score.p2}`
})

let pressingW = false
let pressingS = false

document.addEventListener("keydown", e => {
    if (e.key === "w" && pressingW !== true) {
        pressingW = true
    }
    if (e.key === "s" && pressingS !== true) {
        pressingS = true
    }
})

document.addEventListener("keyup", e => {
    if (e.key === "w" && pressingW !== false) {
        pressingW = false
    }
    if (e.key === "s" && pressingS !== false) {
        pressingS = false
    }
})

function returnMenu () {
    canvas.style.display = "none";
    document.getElementById("score-table").style.display = "none"
    document.getElementById("exit").style.display = "none"
    document.getElementById("main-menu").style.display = "flex"
}

document.getElementById('exit').addEventListener("click", e => {
    returnMenu()
})

socket.on("opponent-disconnected", () => {
    console.log("opponent-disconnected")
    alert("Opponent disconnected")
    returnMenu()
})

document.getElementById("exit").addEventListener("click", e => {
    socket.emit("exit")
})

socket.on("game-won", () => {
    alert("game-won")
    returnMenu()
})

socket.on("game-lost", () => {
    alert("game-lost")
    returnMenu()
})