const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
//Extension allowed for video
const videoExtension = ["mp4", "mkv", "flv"];
//Path to the files

const mysql = require("./db.model");

class Video {
  id = null;
  fileName = null;
  title = null;

  constructor(video) {
    this.id = video.id;
    this.fileName = video.fileName;
    this.title = video.title;
  }
}
Video.videoFolderPath = "./assets/videos";

//Return true if the provided filename is a file in the video folder
const isFile = (fileName) => {
  return fs.lstatSync(fileName).isFile();
};
const isDir = (fileName) => {
  return fs.lstatSync(fileName).isDirectory();
};

const isVideo = (fileName) => {
  return videoExtension.some((extension) => {
    return fileName.endsWith(extension);
  });
};

Video.readVideoFolder = (dir = Video.videoFolderPath) => {
  //Read the content of the directory
  //Filters to keep only the videos
  const folderContent = fs
    .readdirSync(dir)
    .map((f) => {
      let file = dir + "/" + f;
      if (isFile(file)) return file.replace(Video.videoFolderPath + "/", "");
      if (isDir(file)) {
        let ff = Video.readVideoFolder(file).map((v) => v.file);
        return ff;
      }
    })
    .flat();

  let ff = folderContent
    .filter((v) => {
      return isFile(Video.videoFolderPath + "/" + v);
    }) //Filters to keep only the video files
    .filter((v) => isVideo(Video.videoFolderPath + "/" + v))
    .map((v) => {
      let folders = v.split("/");
      let name = folders.pop();
      let folder = folders.pop();

      return {
        name: name.substring(0, name.length - 4),
        tb: Video.createThumbnail(v),
        folder: folder == "videos" ? "none" : folder,
        file: v,
      };
    });

  return ff;
};

Video.getSeries = async () => {
  try {
    let groups = await mysql.queryDB("CALL getGroups()");
    groups = groups.results.map((rs) => {
      //console.log(rs.seasons);
      rs.seasons = JSON.parse(rs.seasons);
      //console.log(rs.seasons);
      return rs;
    });
    /*groups.results.forEach((rs) => {
      groups.fields.forEach((f) => {
        console.log("Value:", f, rs[f]);
      });
    });*/
    return groups;
  } catch (err) {
    console.log(err);
  }
};

Video.getLatest = async () => {
  try {
    let latest = await mysql.queryDB("CALL getLastAdded();");
    return latest.results;
  } catch (error) {
    console.log(error);
  }
};

Video.getAllByPlaylist = async (playlist) => {
  try {
    let data = await mysql.queryDB("CALL getVideosByPlaylist(?);", playlist);
    data = data.results;
    return data;
  } catch (error) {
    console.log(error);
  }
};

Video.getVideoById = async (id) => {
  try {
    let data = await mysql.queryDB("CALL getSearchVideo(?);", id);
    data = data.results;
    //console.log(data);
    return data[0];
  } catch (error) {
    console.log(error);
  }
};

Video.getAllByDb = async () => {
  try {
    let data = await mysql.queryDB("SELECT * FROM videos ORDER BY title;");
    //console.log(data);
    return data.results;
  } catch (error) {
    console.log(error);
  }
};

Video.getSeriesInfo = async (series_id) => {
  try {
    let series = await mysql.queryDB("CALL getSeriesInfo(?);", series_id);
    series = series.results[0];
    series.seasons = await mysql.queryDB(
      "CALL getSeasonsBySeries(?);",
      series_id
    );
    return series;
  } catch (error) {
    console.log(error);
  }
};

Video.createThumbnail = (v, force = false) => {
  let nameWhithoutSpaces = v.replace(/ /g, "_");
  let name = nameWhithoutSpaces.split("/").pop();
  //console.log(name);
  let thumbnailName = `${name.substring(0, name.length - 4)}_960x540`;
  /* console.log(
    v,
    thumbnailName,
    fs.existsSync(`${Video.videoFolderPath}/tb/${thumbnailName}.png`)
  );*/
  let i = 1;
  if (!fs.existsSync(`${Video.videoFolderPath}/tb/${thumbnailName}.png`)) {
    try {
      ffmpeg(Video.videoFolderPath + "/" + v).takeScreenshots(
        {
          filename: thumbnailName,
          timemarks: [`${25 * i}%`],
          size: "960x540",
        },
        `${Video.videoFolderPath}/tb/`,
        function (err) {
          console.log("->", err);
          console.log("Screenshot Saved");
        }
      );
    } catch (error) {
      console.log("--", error);
    }

    console.log("sS");
  }
  return thumbnailName;
};

Video.readVideoFile = (file, range, next) => {
  try {
    //console.log("range in read", range);
    //if (err) next(null, { status: 400, message: err });

    console.log("Playing:", file);
    const videoFileName = `${Video.videoFolderPath}/${file}`;
    if (!isFile(videoFileName) && !isVideo(videoFileName))
      next(null, { status: 400, message: "Requires video file" });

    const videoSize = fs.statSync(videoFileName).size;
    const divided = Math.ceil(videoSize / 300);
    const chunkSize = Math.max(4 * 1e6, divided);
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + chunkSize, videoSize - 1);
    const contentLength = end - start + 1;
    const headers = {
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    };
    console.log(headers["Content-Range"]);

    const stream = fs.createReadStream(videoFileName, { start, end });
    next({ headers, stream });
  } catch (error) {
    console.log("Streaming file fail", error);
  }
};

module.exports = Video;
