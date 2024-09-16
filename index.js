const express = require("express");
const cluster = require("cluster");
const cors = require("cors");
const corsOptions = require("./corsOptions");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const morgan = require("morgan");
const fs = require("fs");
const { getWsServer, getIoServer } = require("./model/websocket");
let io = null;

const options = {
  key: fs.readFileSync("./privatekey.pem"),
  cert: fs.readFileSync("./certificate.pem"),
};

dotenv.config();
require("console-stamp")(console, {
  format: ":date(yyyy/mm/dd HH:MM:ss)",
});

morgan.token("id", function getId(req) {
  return process.pid;
});

morgan.token("prot", (req) => {
  return req.protocol;
});

morgan.token("port", (req) => {
  let port = req.socket.server._connectionKey;
  port = port.split(":");
  port = port.pop();
  return port;
});

if (cluster.isPrimary) {
  console.log("Primary is running ", process.pid);
  for (let i = 0; i < 3; i++) {
    cluster.fork();
  }
} else {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors(corsOptions));
  app.use((req, res, next) => {
    req.id = Math.round(Math.random() * 60);
    next();
  });

  app.options("*", cors(corsOptions));
  app.use(
    morgan(
      "[ :id ] :prot/:http-version [:date[web]] :remote-addr :method ::port :url  :status :response-time ms - :res[content-length]"
    )
  );

  app.use(express.static(__dirname));
  const http = require("http").Server(app);

  app.get("/", (req, res) => {
    res.json({ srv: " test" });
  });
  if (cluster.worker.id === 1) {
    io = getIoServer(http);
    http.listen(4501, () => {
      console.log(`Server is running on port ${4501}.`);
    });
  } else {
    require("./route/video.route")(app);

    const https = require("https").createServer(options, app);
    // set port, listen for requests
    http.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}.`);
    });

    https.listen(process.env.PORT_HTTPS, () => {
      console.log(`Server is running on port ${process.env.PORT_HTTPS}.`);
    });
  }
}
