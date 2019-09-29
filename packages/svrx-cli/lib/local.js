const fs = require('fs');
const path = require('path');
const semver = require('semver');
const rimraf = require('rimraf');
const config = require('./config');

const getSvrxPath = (version, versionsRoot) => path.resolve(
  versionsRoot || config.VERSIONS_ROOT,
  version,
  'lib/svrx.js',
);
const getVersions = (versionsRoot) => {
  const root = versionsRoot || config.VERSIONS_ROOT;
  const { lstatSync, readdirSync } = fs;
  const { join } = path;
  const isDirectory = (name) => lstatSync(join(root, name)).isDirectory();
  const getDirectories = (source) => readdirSync(source).filter(isDirectory);

  return (fs.existsSync(root) && getDirectories(root)) || [];
};
module.exports = {
  getLatestVersion: (versionsRoot) => {
    const versions = getVersions(versionsRoot);
    versions.sort((v1, v2) => (semver.lt(v1, v2) ? 1 : -1));

    const noBetaVersions = versions.filter((v) => v.indexOf('-') === -1);
    if (noBetaVersions.length > 0) return noBetaVersions[0];
    return versions.length > 0 ? versions[0] : null;
  },

  getVersions,

  exists: (version, versionsRoot) => version && fs.existsSync(getSvrxPath(version, versionsRoot)),

  load: (version, optionsFromCli = {}, inlineOptions = {}) => new Promise((resolve) => {
    const Svrx = require(getSvrxPath(version)); // eslint-disable-line
    resolve(new Svrx(inlineOptions, optionsFromCli));
  }),

  remove: (version) => new Promise((resolve) => {
    const versionPath = path.resolve(config.VERSIONS_ROOT, version);
    if (fs.existsSync(versionPath)) {
      rimraf(versionPath, resolve);
    } else {
      throw new Error(`Version ${version} is not exists or not a valid version string('x.x.x')`);
    }
  }),
};
