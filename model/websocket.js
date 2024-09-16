const { WebSocketServer } = require("ws");
const { Server } = require("socket.io");
const video = require("../model/videos.model");
let users = [];

const getWsServer = (server) => {
  let wsServer = new WebSocketServer({ server });

  wsServer.on("connection", async function (connection) {
    console.log(`Received a new connection.`);
    //let groups = await video.getSeries();
    //connection.send(JSON.stringify(groups));
  });

  return wsServer;
};

const getIoServer = (server) => {
  console.log("Starting socket srv");
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  //Add this before the app.get() block
  io.on("connection", (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);
    socket.on("disconnect", () => {
      users = users.filter((u) => socket.id != u.id, []);
      console.log("🔥: A user disconnected", users.length);
    });

    socket.on("test", async (data) => {
      let groups = await video.getSeries();
      console.log("Got a test");
      io.emit("got", { t: "Testing data", groups });
    });

    socket.on("mouseMove", async (data) => {
      console.log(data);
      let id = users.findIndex((u) => u.id == data.id);
      if (id != -1) users[id] = { ...users[id], x: data.x, y: data.y };
      io.emit("users", { users: users });
    });

    socket.on("touch", (data) => {
      console.log("touch");
      console.log(data);
    });

    socket.on("touchStart", (data) => {
      console.log("touch Start");
      console.log(data);
    });

    socket.on("newUser", (data) => {
      users.push({
        id: socket.id,
        username: `${data.newUser}-${socket.id}`,
        x: 0,
        y: 0,
      });
      io.emit("users", { users: users });
    });

    socket.on("logout", (data) => {
      users = users.filter((u) => socket.id != u.id, []);
      console.log("logout");
    });
  });
  return io;
};

module.exports = { getWsServer, getIoServer };
