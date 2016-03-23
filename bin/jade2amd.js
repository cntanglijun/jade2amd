#!/usr/bin/env node

'use strict';

const path = require('path');
const program = require('commander');
const fs = require('fs-extra');
const fsp = require('fs-promise');
const vfs = require('vinyl-fs');
const colors = require('colors');
const jade = require('gulp-jade');
const wrapAmd = require('gulp-wrap-amd');
const map = require('map-stream');
const pkg = require('../package.json');

program
  .version(pkg.version)
  .option('-p, --path <path>', 'specify the template path')
  .option('-o, --out <dir>', 'specify the output path')
  .parse(process.argv);

const filePath = program.path;
const outPath = program.out;

function compile(path, to) {
  vfs.src(path)
    .pipe(jade({
      client: true
    }))
    .pipe(wrapAmd({
      deps: ['jade'],
      params: ['jade']
    }))
    .pipe(vfs.dest(to))
    .pipe(map(file => {
      console.log('compiled: '.cyan + file.path.magenta);
    }));
}

function watcher(handle) {
  fs.watch(filePath, {persistent: true, recursive: true}, handle);
}

function watcherHandle(file) {
  if (!path.extname(file).match(/\.jade$/)) {
    return;
  }

  fsp.access(file, fs.F_OK)
    .then(() => {
      compile(file, outPath || path.dirname(file));
    });
}

// filePath maybe dir|file
fsp.stat(filePath)
  .then(stats => {
    if (stats.isFile()) {
      watcher((event, file) => {
        watcherHandle(file);
      });

    }
    if (stats.isDirectory()) {
      watcher((event, file) => {
        watcherHandle(path.join(filePath, file));
      });
    }
  })
  .catch(err => {
    console.log(err.message.red);
  });

