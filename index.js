const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: true,
});
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function main() {
  // open the database file
  const db = await open({
    filename: "chat.db",
    driver: sqlite3.Database,
  });

  // create our 'messages' table (you can ignore the 'client_offset' column for now)
  await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_offset TEXT UNIQUE,
          content TEXT
      );
    `);

  app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "public", "index.html"));
  });
  io.on("connection", async (socket) => {
    console.log("user connected", socket.id);
    // socket.on("chat message", (msg) => {
    //   io.emit("chat message", msg);
    // });
    // socket.on("chat message", async (msg) => {
    //   let result;
    //   try {
    //     // store the message in the database
    //     result = await db.run("INSERT INTO messages (content) VALUES (?)", msg);
    //   } catch (e) {
    //     // TODO handle the failure
    //     return;
    //   }
    //   // include the offset with the message
    //   io.emit("chat message", msg, result.lastID);
    // })

    socket.on("chat message", async (msg, clientOffset, callback) => {
      let result;
      try {
        result = await db.run(
          "INSERT INTO messages (content, client_offset) VALUES (?, ?)",
          msg,
          clientOffset
        );
      } catch (e) {
        if (e.errno === 19 /* SQLITE_CONSTRAINT */) {
          // the message was already inserted, so we notify the client
          callback();
        } else {
          // nothing to do, just let the client retry
        }
        return;
      }
      io.emit("chat message", msg, result.lastID);
      // acknowledge the event
      callback();
    });

    if (!socket.recovered) {
      // if the connection state recovery was not successful
      try {
        await db.each(
          "SELECT id, content FROM messages WHERE id > ?",
          [socket.handshake.auth.serverOffset || 0],
          (_err, row) => {
            socket.emit("chat message", row.content, row.id);
          }
        );
      } catch (e) {
        // something went wrong
      }
    }
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
}

main();
