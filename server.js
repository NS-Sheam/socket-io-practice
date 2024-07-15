const express = require("express");
const app = express();
const http = require("http");
const server = http.Server(app);
app.set("view engine", "ejs");
app.use(express.static("public"));
const { v4: uuidV4 } = require("uuid");
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
app.use("/peerjs", peerServer);
app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});
app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});
io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    console.log(`User ${userId} joining room ${roomId}`);
    socket.join(roomId);
    setTimeout(() => {
      const room = io.sockets.adapter.rooms.get(roomId);
      if (room) {
        socket.to(roomId).emit("user-connected", userId);
      } else {
        console.error(`Room ${roomId} not found`);
      }
    }, 1000);
    // socket.on("disconnect", () => {
    //   socket.to(roomId).broadcast.emit("user-disconnected", userId);
    // });
  });
});
server.listen(7777, () => {
  console.log("Server running on port 7777");
});
