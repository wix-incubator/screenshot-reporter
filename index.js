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

function storeScreenShot(data, file) {
  var stream = fs.createWriteStream(file);
  stream.write(new Buffer(data, 'base64'));
  stream.end();
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
    var screenshotName = camelize(spec.description.toString()) + '.png';
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

    var linkToScreenshot = process.env.IS_BUILD_AGENT ?
      `http://ci.dev.wix/agent/downloadLogs.html?agentName=${agentName}&logName=${logName}/AutomationLogs/${screenshotName}&forceInline=true`
      : `file://${process.сwd()}/${this.baseDirectory}/${screenshotName}`;
    jasmine.getGlobal().console.log('##teamcity[buildProblem description=\'Test:\"' + spec.description  + '\" failed, Screenshot link: ' + linkToScreenshot + '\']');
  }
}


module.exports = ScreenshotReporter;
