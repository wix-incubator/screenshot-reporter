'use strict';

var fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp');

var confName = process.env.TEAMCITY_BUILDCONF_NAME,
  buildNumber = process.env.BUILD_NUMBER,
  agentName = process.env.HOSTNAME,
  logName = confName + '_BuildNum_' + buildNumber;

/** Function: storeScreenShot
 * Stores base64 encoded PNG data to the file at the given path.
 *
 * Parameters:
 *     (String) data - PNG data, encoded in base64
 *     (String) file - Target file path
 */
function storeScreenShot(data, file) {
  var stream = fs.createWriteStream(file);

  stream.write(new Buffer(data, 'base64'));
  stream.end();
}

/** Function: defaultPathBuilder
 * This function builds paths for a screenshot file.
 *
 * Returns:
 *     (String) containing the built path
 */
function defaultPathBuilder() {
  return "/home/builduser/" + agentName + "/logs/" + logName + "/AutomationLogs";
}

/** Class: ScreenshotReporter
 * Creates a new screenshot reporter using the given `options` object.
 *
 * For more information, please look at the README.md file.
 *
 * Parameters:
 *     (Object) options - Object with options as described below.
 *
 * Possible options:
 *     (String) baseDirectory - The path to the directory where screenshots are
 *                              stored. If not existing, it gets created.
 *                              Mandatory.
 *     (Boolean) takeScreenShotsForSkippedSpecs - Do you want to capture a
 *                                                screenshot for a skipped spec?
 *                                                Optional (default: false).
 */
function ScreenshotReporter() {
  this.baseDirectory = defaultPathBuilder();
  this.takeScreenShotsOnlyForFailedSpecs = true;
}

/** Function: reportSpecResults
 * Called by Jasmine when reporteing results for a test spec. It triggers the
 * whole screenshot capture process and stores any relevant information.
 *
 * Parameters:
 *     (Object) spec - The test spec to report.
 */
ScreenshotReporter.prototype.reportSpecResults =
  function reportSpecResults(spec) {
    /* global browser */
    var self = this,
      results = spec.results(),
      screenshotName = spec + '.' + Date.now();

    if(self.takeScreenShotsOnlyForFailedSpecs && results.passed()) {
      return;
    }

    browser.takeScreenshot().then(function () {
        var baseName = screenshotName,
          screenShotFile = baseName + '.png',
          screenShotPath = path.join(self.baseDirectory, screenShotFile),
          directory = path.dirname(screenShotPath);

        mkdirp(directory, function(err) {
          if(err) {
            throw new Error('Could not create directory ' + directory);
          } else {
            storeScreenShot(png, screenShotPath);
          }
        });
      });

    var linkToScreenshot = 'http://ci.dev.wix/agent/downloadLogs.html?agentName=' + agentName + '&logName=' + logName
      + '/AutomationLogs/ScreenShots/'+ screenshotName +'&forceInline=true'.replace(" ", "_");

    console.log(' ##teamcity[buildProblem description=\'Test' + spec  + 'failed, Screenshot link:' + linkToScreenshot + '\'');

    return screenShotPath;
  };

module.exports = ScreenshotReporter;