const video = require("../controller/videos.controller");
module.exports = (app) => {
  app.get("/video/all", video.getList);
  app.get("/v/watch/:id", video.readVideo);
  app.get("/video/info/:id", video.getVideoInfo);
  app.get("/video/g", video.getGroups);
  app.get("/video/p/:playlist", video.getAllDb);
  app.get("/video/p/info/:series", video.getSeriesInfo);
  app.get("/video/id/", video.getNewId);
  app.get("/video/latest", video.getLatest);
};
