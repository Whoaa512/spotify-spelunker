global.XMLHttpRequest = require("node-http-xhr");
global.window = global;
var Spotify = require("spotify-web-api-js");
var moment = require("moment");
var fs = require("fs");
var chunk = require("lodash/chunk");
var spotifyApi = new Spotify();

assert(fs.existsSync(".access_token"), "Missing `.access_token` file");

spotifyApi.setAccessToken(fs.readFileSync("./.access_token", "utf8"));

async function getLastSongs({ limit = 50 } = {}) {
  let result = [];
  let before = Date.now();
  while (result.length < limit) {
    console.log("result.length", result.length);
    const { items, cursors } = await spotifyApi.getMyRecentlyPlayedTracks({
      limit: 50,
      before: before
    });
    console.log("items.length", items.length);
    if (items.length > 0) {
      result = result.concat(items);
    }
    if (cursors && cursors.before) {
      before = cursors.before;
    } else {
      console.log("out of cursors");
      break;
    }
  }
  return result;
}

async function getLastSongsByHours({ hours = 24 } = {}) {
  const limit = Infinity;
  let result = [];
  let after = moment()
    .subtract(hours, "hours")
    .valueOf();

  while (result.length < limit) {
    console.log("result.length", result.length);
    const { items, cursors } = await spotifyApi.getMyRecentlyPlayedTracks({
      limit: 50,
      after
    });
    console.log("items.length", items.length);
    if (items.length > 0) {
      result = result.concat(items);
    }
    if (cursors && cursors.after) {
      after = cursors.after;
    } else {
      console.log("out of cursors");
      break;
    }
  }
  return result;
}

async function addSongsToPlaylist(playlistId, trackUris) {
  const responses = [];
  for (const tracks of chunk(trackUris, 100)) {
    responses.push(await spotifyApi.addTracksToPlaylist(playlistId, tracks));
  }
  return responses;
}

(async () => {
  // const result = await getLastSongs({ limit: 100 })
  try {
    const result = await getLastSongsByHours({ hours: 2 * 24 });
    const trackUris = result.map(({ track }) => track.uri);
    const { id: playlistId } = await spotifyApi.createPlaylist({
      name: "my-cool-playlist"
    });
    const next = await addSongsToPlaylist(playlistId, trackUris);
    // console.log('result', result);
    console.log("next", next);
    // console.log('result', result.length);
  } catch (error) {
    console.error(error.response || error);
  }
})();
