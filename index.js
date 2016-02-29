/* global browser */
'use strict';

var fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp');

var confName = (process.env.TEAMCITY_BUILDCONF_NAME || '').replace(' ', '_'),
  buildNumber = process.env.BUILD_NUMBER || '',
  agentName = `agent${process.env.agentID}`,
  logName = `${confName}_BuildNum_${buildNumber}`;

function storeScreenShot(data, file) {
  var stream = fs.createWriteStream(file);
  stream.write(new Buffer(data, 'base64'));
  stream.end();
}

class ScreenshotReporter {
  constructor() {
    this.baseDirectory = process.env.IS_BUILD_AGENT ? `/home/builduser/${agentName}/logs/${logName}/AutomationLogs` : 'test/e2e/screenshots';
  }

  specDone(spec) {
    var screenshotName = spec.description + '.' + Date.now() + '.png';
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

    var linkToScreenshot = `/agent/downloadLogs.html?agentName=${agentName}&logName=${logName}/AutomationLogs/ScreenShots/${screenshotName}&forceInline=true`;
    jasmine.getGlobal().console.log('##teamcity[buildProblem description=\'Test' + spec  + 'failed, Screenshot link:' + linkToScreenshot + '\']');
  }
}


module.exports = ScreenshotReporter;
