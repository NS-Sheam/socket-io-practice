const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const app = express();
const server = createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});
io.on("connection", (socket) => {
  console.log("user connected", socket.id);
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
  socket.on("request", (arg1, arg2, callback) => {
    console.log(arg1); // { foo: 'bar' }
    console.log(arg2); // 'baz'
    callback({
      status: "ok",
    });
  });
  //   socket.onAny((event, ...args) => {
  //     console.log(event, args);
  //   });
  socket.on("join", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
    io.to(room).emit("room msg", `Hello ${room}`);
    // Broadcast to all connected clients except those in the room
    io.except(room).emit("room msg except", `Hello everyone except ${room}`);
  });
  socket.on("leave", (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room ${room}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
  });
  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
  });
});

server.listen(7777, () => {
  console.log("server running at http://localhost:7777");
});
