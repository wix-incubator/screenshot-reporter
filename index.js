/* global browser */
'use strict';

var fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp');

var confName = (process.env.TEAMCITY_BUILDCONF_NAME || '').replace(/ /g, '_'),
  buildNumber = (process.env.BUILD_NUMBER || '').split('#').pop(),
  agentName = (process.env.HOSTNAME || '').replace('-', '/'),
  agentId = `agent${process.env.agentID}`,
  logName = `${confName}_BuildNum_${buildNumber}`;

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
    this.baseDirectory = process.env.IS_BUILD_AGENT ? `/home/builduser/${agentId}/logs/${logName}/AutomationLogs` : 'test/e2e/screenshots';
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
      return `http://ci.dev.wix/agent/downloadLogs.html?agentName=${agentName}&logName=${logName}/AutomationLogs/${fileName}&forceInline=true`;
    }

    function toFileLocalLink(fileName) {
      return `file://${process.cwd()}/${this.baseDirectory}/${fileName}`;
    }

    var linkToScreenshot, linkToHtml;
    if (process.env.IS_BUILD_AGENT) {
      linkToScreenshot = toFileRemoteLink(screenshotName);
      linkToHtml = toFileRemoteLink(htmlSnapshotName);
    } else {
      linkToScreenshot = toFileLocalLink.call(this, screenshotName);
      linkToHtml = toFileLocalLink.call(this, htmlSnapshotName);
    }

    jasmine.getGlobal().console.log('##teamcity[buildProblem description=\'Test ' + spec.description  + ' failed, ' +
      'Screenshot link: ' + linkToScreenshot + ' \', ' +
      'Html link: ' + linkToHtml + ' \']');
  }

}


module.exports = ScreenshotReporter;
