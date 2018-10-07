const del = require('del');
const download = require('download');
const fs = require('fs');
const path = require('path');
const uniqueString = require('unique-string');
const xdgBasedir = require('xdg-basedir');

export default class Remote {
  constructor(project, branch, cb) {
    const url = `https://github.com/dwmaj/${project}/archive/${branch}.zip`;
    const cache = path.join(Remote.cacheRoot(), `${project}-${uniqueString()}`);

    const done = function done(err) {
      if (err) {
        cb(err);

        return;
      }

      cb(null, cache);
    };

    fs.stat(cache, err => {
      if (err) {
        // No cache -> fetch and extract
        Remote.getRepo(url, cache, done);
      } else {
        // Delete cache, then fetch and extract
        // Should not happen, generator will delete it…
        del(cache, { force: true }).then(paths => {
          console.log('🗑  Cache deleted: ', paths);
          Remote.getRepo(url, cache, done);
        });
      }
    });
  }

  static cacheRoot() {
    return path.join(xdgBasedir.cache, 'dwmaj-bootstrap');
  }

  static getRepo(archive, destination, done) {
    const opts = {
      mode: '755',
      extract: true,
      strip: 1,
    };

    download(archive, destination, opts)
      .then(() => {
        done();
      });
  }
}
