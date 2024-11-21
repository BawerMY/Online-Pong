const express = require('express');
const app = express()
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const cors = require('cors');
const port = 3000;

app.use(cors())
app.use(express.static('public'));
app.get('/', function(req, res) {
    res.sendfile('public/index.html');
});

class Game {
    values = {
        canvasWidth: 1000,
        canvasHeight: 500,
        moveSpeed: 5,
        playerHeight: 100,
        playerWidth: 33,
        ballRadius: 10,
        ballSpeed: 3,
        ballSpeedIncrease: 0.5
    }
    constructor(hostId) {
        this.firstPlayer = hostId;
        this.secondPlayer = null;
        this.score = {
            p1: 0,
            p2: 0
        }
        this.firstPlayerY = this.values.canvasHeight / 2
        this.firstPlayerMove = 0
        this.secondPlayerY = this.values.canvasHeight / 2
        this.secondPlayerMove = 0
        this.ballPosition = {
            x: this.values.canvasWidth / 2,
            y: this.values.canvasHeight / 2
        }
        this.ballDirection = {
            x: -1,
            y: -0
        }
        this.ballSpeed = 3
    }
    play = (socket, toId) => {
        this.intervalId = setInterval(() => {
            this.firstPlayerY += this.firstPlayerMove * this.values.moveSpeed
            this.ballPosition.x += this.ballDirection.x * this.ballSpeed
            this.ballPosition.y += this.ballDirection.y
            if (this.firstPlayerY < this.values.playerHeight / 2) this.firstPlayerY = this.values.playerHeight / 2
            if (this.firstPlayerY > this.values.canvasHeight - this.values.playerHeight / 2) this.firstPlayerY = this.values.canvasHeight - this.values.playerHeight / 2
            this.secondPlayerY += this.secondPlayerMove * this.values.moveSpeed
            if (this.secondPlayerY < this.values.playerHeight / 2) this.secondPlayerY = this.values.playerHeight / 2
            if (this.secondPlayerY > this.values.canvasHeight - this.values.playerHeight / 2) this.secondPlayerY = this.values.canvasHeight - this.values.playerHeight / 2
            const game = {
                firstPlayerY: this.firstPlayerY,
                secondPlayerY: this.secondPlayerY,
                ballPosition: this.ballPosition,
            }
            if (this.ballPosition.x >= this.values.canvasWidth - this.values.playerWidth - this.values.ballRadius) {
                if (Math.abs(this.ballPosition.y - this.secondPlayerY) <= this.values.playerHeight / 2) {
                    const touchValue = this.ballPosition.y - this.secondPlayerY
                    this.ballDirection.x *= -1
                    this.ballDirection.y = touchValue / (this.values.playerHeight / 2) * this.ballSpeed
                    this.ballSpeed += this.values.ballSpeedIncrease
                }
            }
            if (this.ballPosition.x - this.values.ballRadius <= this.values.playerWidth) {
                if (Math.abs(this.ballPosition.y - this.firstPlayerY) <= this.values.playerHeight / 2) {
                    const touchValue = this.ballPosition.y - this.firstPlayerY
                    this.ballDirection.x *= -1
                    this.ballDirection.y = touchValue / (this.values.playerHeight / 2) * this.ballSpeed
                    this.ballSpeed += this.values.ballSpeedIncrease
                }
            }
            if (this.ballPosition.y > this.values.canvasHeight - this.values.ballRadius || this.ballPosition.y < this.values.ballRadius) {
                this.ballDirection.y *= -1
            }
            if (this.ballPosition.x < this.values.ballRadius) {
                this.score.p2 += 1
                this.firstPlayerY = 250
                this.secondPlayerY = 250
                socket.emit("score", this.score)
                socket.to(toId).emit("score", this.score)
                this.ballPosition = {
                    x: this.values.canvasWidth / 2,
                    y: this.values.canvasHeight / 2
                }
                this.ballDirection = {
                    x: -1,
                    y: 0
                }
                this.ballSpeed = this.values.ballSpeed
            }
            if (this.ballPosition.x > this.values.canvasWidth - this.values.ballRadius) {
                this.score.p1 += 1
                this.firstPlayerY = 250
                this.secondPlayerY = 250
                socket.emit("score", this.score)
                socket.to(toId).emit("score", this.score)
                this.ballPosition = {
                    x: this.values.canvasWidth / 2,
                    y: this.values.canvasHeight / 2
                }
                this.ballDirection = {
                    x: 1,
                    y: 0
                }
                this.ballSpeed = this.values.ballSpeed
            }
            if (this.score.p1 === 15) {
                if (socket.id === this.firstPlayer) {
                    socket.emit("game-won")
                    socket.to(toId).emit("game-lost")
                } else {
                    socket.emit("game-lost")
                    socket.to(toId).emit("game-won")
                }
                delete games[io.sockets.sockets.get(this.firstPlayer).playingGameId]
                io.sockets.sockets.get(socket.id).playingGameId = null
                io.sockets.sockets.get(toId).playingGameId = null
                clearInterval(this.intervalId)
            } else if (this.score.p2 === 15) {
                if (socket.id === this.firstPlayer) {
                    socket.emit("game-lost")
                    socket.to(toId).emit("game-won")
                } else {
                    socket.emit("game-won")
                    socket.to(toId).emit("game-lost")
                }
                delete games[io.sockets.sockets.get(this.firstPlayer).playingGameId]
                io.sockets.sockets.get(socket.id).playingGameId = null
                io.sockets.sockets.get(toId).playingGameId = null
                clearInterval(this.intervalId)
            } else {
                socket.emit("game", game)
                socket.to(toId).emit("game", game)
            }
        }, 16)
    }

}

let games = {}

let lastGameId = 0

io.on('connection', socket => {
    let playingGameId = null
    socket.on('create-game', () => {
        if (playingGameId !== null) {
            delete games[playingGameId];
            playingGameId = null
        }
        games[lastGameId] = new Game(socket.id)
        playingGameId = lastGameId
        lastGameId++
        socket.emit('game-created', playingGameId);
    })

    socket.on("join-game", gameId => {
        if (games[gameId] === undefined) socket.emit('game-not-found');
        else if (games[gameId].secondPlayer === null) {
            playingGameId = gameId
            games[gameId].secondPlayer = socket.id
            socket.emit('waiting-for-the-host-to-start-the-game');
            socket.to(games[gameId].firstPlayer).emit("waiting-for-you-to-start-the-game")
        } else {
            socket.emit("game-already-full")
        }
    })

    socket.on('exit-lobby', () => {
        if (games[playingGameId]) {
            if (games[playingGameId].firstPlayer === socket.id) {
                if (games[playingGameId].secondPlayer !== null) {
                    socket.to(games[playingGameId].secondPlayer).emit("opponent-disconnected")
                    io.sockets.sockets.get(games[playingGameId].secondPlayer).playingGameId = null
                }
                delete games[playingGameId]
                playingGameId = null
            } else if(games[playingGameId].secondPlayer === socket.id) {
                socket.to(games[playingGameId].firstPlayer).emit("game-not-full")
                games[playingGameId].secondPlayer = null
            }
        }
    })

    socket.on('exit', () => {
        if (socket.id === games[playingGameId].firstPlayer) {
            socket.to(games[playingGameId].secondPlayer).emit("opponent-disconnected")
            io.sockets.sockets.get(games[playingGameId].secondPlayer).playingGameId = null
        } else {
            socket.to(games[playingGameId].firstPlayer).emit("opponent-disconnected")
            io.sockets.sockets.get(games[playingGameId].firstPlayer).playingGameId = null
        }
        clearInterval(games[playingGameId].intervalId)
        delete games[playingGameId]
        playingGameId = null
    })

    socket.on('game-start', () => {
        socket.to(games[playingGameId].secondPlayer).emit("game-start")
        games[playingGameId].play(socket, games[playingGameId].firstPlayer === socket.id ? games[playingGameId].secondPlayer : games[playingGameId].firstPlayer)
    })

    socket.on('input', data => {
        if (games[playingGameId] === undefined) return
            let player = games[playingGameId].firstPlayer === socket.id ? "firstPlayer" : "secondPlayer"
        if (data.pressingW) {
            if (data.pressingS) games[playingGameId][player + "Move"] = 0
            else games[playingGameId][player + "Move"] = -1
        }  else if (data.pressingS) games[playingGameId][player + "Move"] = 1
        else games[playingGameId][player + "Move"] = 0
    })

    socket.on('disconnect', () => {
        if (games[playingGameId]) {
            if (games[playingGameId].firstPlayer === socket.id) {
                socket.to(games[playingGameId].secondPlayer).emit('opponent-disconnected');
                io.sockets.sockets.get(games[playingGameId].secondPlayer).playingGameId = null
            } else {
                socket.to(games[playingGameId].firstPlayer).emit('opponent-disconnected');
                io.sockets.sockets.get(games[playingGameId].firstPlayer).playingGameId = null
            }
            delete games[playingGameId]
        }
    })
})

server.listen(port, function() {
    console.log(`Listening on port ${port}`);
});