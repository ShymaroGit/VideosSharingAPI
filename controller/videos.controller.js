const video = require("../model/videos.model");
const { nanoid } = require("nanoid");
const { getVideoDurationInSeconds } = require("get-video-duration");

let videoList = [];
let vidList = new Map();

const pad = (num, size) => {
  var s = "000" + num.toFixed(0);
  return s.substr(s.length - size);
};

let randomTime = () => {
  return rd(50).toFixed(0) + ":" + pad(rd(60), 2);
};
let rd = (max = 12) => Math.random() * max;

const newID = () => nanoid(10);

const lastMonth = (months) => {
  let mni = new Date();
  mni.setMonth(mni.getMonth() - months);
  return mni;
};

const getNewId = (req, res) => {
  res.send({ id: newID() });
};

const fillVideoList = async () => {
  let list = video.readVideoFolder();
  let dbList = await video.getAllByDb();

  for await (const v of dbList) {
    if (!vidList.has(v.id)) {
      vidList.set(v.id, v);
      let vidIndex = videoList.findIndex((f) => f.filename == v.filename);
      if (vidIndex == -1) videoList.push(v);
    }
  }

  for await (const t of list) {
    //vidList.has()
    let vidIndex = videoList.findIndex((f) => f.filename == t.file);
    if (vidIndex == -1) {
      //console.log("index", vidIndex, t.file);
      let a = 0;
      try {
        a = await getVideoDurationInSeconds(
          video.videoFolderPath + "/" + t.file
        );
      } catch (error) {
        console.log("getting seconds error", error);
      }
      let min = a / 60;
      const sec = Math.floor(a % 60);
      min = Math.floor(min);
      let newVideo = {
        id: newID(),
        filename: t.file,
        title: t.name,
        thumbnail: t.tb + ".png",
        description: "Video ajouter manuellement " + Math.floor(rd() * 45),
        time: `${min}:${pad(sec, 2)}`,
        added: lastMonth(rd()),
        folder: t.folder ? t.folder : "none",
      };
      videoList.push(newVideo);

      vidList.set(newVideo.id, {
        id: newVideo.id,
        filename: newVideo.filename,
        thumbnail: newVideo.thumbnail,
        time: newVideo.time,
        folder: newVideo.folder,
      });
    } else {
      //console.log("index", vidIndex, t.file);
    }
  }
};

const getList = async (req, res) => {
  await fillVideoList();
  let arrayToSend = [];
  vidList.forEach((t) => {
    let { filename, ...v } = t;
    arrayToSend.push(t);
  });
  res.send(arrayToSend);
};

try {
  fillVideoList();
} catch (error) {
  console.log("error");
}

const readVideo = async (req, res) => {
  let range = req.headers.range;
  //If there's no range send an error message
  console.log("range received", range);
  if (!range) {
    //console.log("header:", req.headers);
    range = "bytes=0-";
    res.status(400).send("Requires Range header");
    return;
  }

  if (!req.params) {
    res.status(400).send("Need a param");
  }
  id = req.params.id;
  //console.log("nb", vidList.size);
  //console.log(vidList);
  //let videoFound = videoList.find((v) => v.id == id);
  let videoFound = vidList.get(id);
  /*console.log(
    "found in array",
    videoFound != undefined ? videoFound.title : videoFound
  );*/
  if (typeof videoFound == "undefined") {
    videoFound = await video.getVideoById(id);
    //console.log("found in db", videoFound.title);
  }

  if (typeof videoFound == "undefined")
    return res.status(404).json({ error: "video not found, file" });
  //console.log(videoFound);
  video.readVideoFile(videoFound.filename, range, (info, err) => {
    if (err) {
      console.log("error video:", err);
      res.status(err.status).send(err.message);
      return;
    }

    res.writeHead(206, info.headers);

    info.stream.pipe(res);
  });
};

const getVideoInfo = async (req, res) => {
  if (!req.params) {
    res.status(400).send("Need a param");
  }
  const id = req.params.id;
  //let videoFound = videoList.find((v) => v.id == id);
  let videoFound = vidList.get(id);
  console.log("in set array?", videoFound);
  if (typeof videoFound == "undefined") {
    videoFound = await video.getVideoById(id);
    vidList.set(videoFound.id, videoFound);
    //videoList.push(videoFound);
  } else {
    console.log("getting from db");
    video
      .getVideoById(id)
      .then((video) => {
        vidList.set(video.id, video);
      })
      .catch((err) => console.log(err));
  }

  try {
    let { filename, ...v } = videoFound;
    res.status(200).json(v);
  } catch (error) {
    console.log("filename error", error);
    res.status(404).json({ error: "Video not found" });
  }
};

const getGroups = async (req, res) => {
  let groups = await video.getSeries();
  res.status(200).json(groups);
};

const getAllDb = async (req, res) => {
  let { playlist } = req.params;

  let groups = await video.getAllByPlaylist(playlist);
  for await (const v of groups) {
    vidList.set(v.id, v);
  }
  res.status(200).json(groups);
};

const getSeriesInfo = async (req, res) => {
  let { series } = req.params;
  let seriesInfo = await video.getSeriesInfo(series);
  //console.log(seriesInfo);
  res.status(200).json(seriesInfo);
};

const getLatest = async (req, res) => {
  let latests = await video.getLatest();
  //console.log(latests);
  res.status(200).json(latests);
};

module.exports = {
  getList,
  readVideo,
  getVideoInfo,
  getGroups,
  getAllDb,
  getNewId,
  getSeriesInfo,
  getLatest,
};
