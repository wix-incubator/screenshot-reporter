/* global browser */
'use strict';

var fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp');

function storeFile(data, file, encoding) {
  var stream = fs.createWriteStream(file);
  stream.write(new Buffer(data, encoding));
  stream.end();
}

function storeScreenShot(data, file) {
  storeFile(data, file, 'base64');
}

function storeRawHtml(data, file) {
  storeFile(data, file, 'utf-8');
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return '';
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

class ScreenshotReporter {
  constructor() {
    this.baseDirectory = process.env.SCREENSHOT_BASE_DIR || 'test/e2e/screenshots';
  }

  specDone(spec) {
    var specName = camelize(spec.description.toString());
    var screenshotName = specName + '.png';
    var htmlSnapshotName = specName + '.html';
    if(spec.status !== 'failed') {
      return;
    }

    browser.takeScreenshot().then(png => {
      mkdirp(this.baseDirectory, err => {
        if(err) {
          throw new Error('Could not create directory ' + this.baseDirectory);
        } else {
          storeScreenShot(png, path.join(this.baseDirectory, screenshotName));
        }
      });
    });

    browser.getPageSource().then(html => {
      storeRawHtml(html, path.join(this.baseDirectory, htmlSnapshotName));
    });

    function toFileRemoteLink(fileName) {
      var baseRemoteLink = process.env.SCREENSHOT_REMOTE_LINK;
      return `${baseRemoteLink}${fileName}&forceInline=true`;
    }

    const toFileLocalLink = (fileName) => {
      return `file://${process.cwd()}/${this.baseDirectory}/${fileName}`;
    };

    var linkToScreenshot, linkToHtml;
    if (process.env.SCREENSHOT_REMOTE_LINK) {
      linkToScreenshot = toFileRemoteLink(screenshotName);
      linkToHtml = toFileRemoteLink(htmlSnapshotName);
    } else {
      linkToScreenshot = toFileLocalLink(screenshotName);
      linkToHtml = toFileLocalLink(htmlSnapshotName);
    }

    jasmine.getGlobal().console.log('##teamcity[buildProblem description=\'Test ' + spec.description  + ' failed, ' +
      'Screenshot link: ' + linkToScreenshot + ' , ' +
      'Html link: ' + linkToHtml + ' \']');
  }
}

module.exports = ScreenshotReporter;
