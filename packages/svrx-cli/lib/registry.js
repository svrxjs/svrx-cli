const path = require('path');
const { npm, logger } = require('svrx-util');
const _ = require('lodash');
const tmp = require('tmp');
const fs = require('fs-extra');
const { fork } = require('child_process');
const config = require('./config');
const local = require('./local');

const getVersions = async () => {
  const spinner = logger.progress('Searching versions...');
  try {
    const result = await npm.view(['svrx', 'versions']);
    if (spinner) spinner();
    return _.chain(result)
      .values()
      .first()
      .value().versions.filter((v) => v.indexOf('-') === -1);
  } catch (e) {
    if (spinner) spinner();
    logger.error(e);
    return null;
  }
};

const getTags = async () => {
  const spinner = logger.progress('Searching tags...');
  try {
    const result = await npm.view(['svrx', 'dist-tags']);
    if (spinner) spinner();
    return _.chain(result)
      .values()
      .first()
      .value()['dist-tags'];
  } catch (e) {
    if (spinner) spinner();
    return null;
  }
};

/**
 * install a specific version of svrx
 * @param version
 * @returns {Promise<*>}
 */
const install = async (version) => {
  const versions = await getVersions();
  versions.reverse();

  const installVersion = version || versions[0];

  if (local.exists(installVersion)) return installVersion; // already installed

  const task = fork(path.join(__dirname, './task.js'), {
    silent: true,
  });
  const tmpObj = tmp.dirSync();
  const tmpPath = tmpObj.name;
  const options = {
    name: 'svrx',
    version: installVersion,
    path: tmpPath,
    npmLoad: {
      loaded: false,
      prefix: tmpPath,
    },
    VERSIONS_ROOT: config.VERSIONS_ROOT,
  };

  const spinner = logger.progress('Installing svrx core package...');

  try {
    const installedVersion = await new Promise((resolve, reject) => {
      task.on('error', reject);
      task.on('message', (ret) => {
        if (ret.error) reject(new Error(ret.error));
        else resolve(ret);
      });
      task.send(options);
    });
    if (spinner) spinner();
    return installedVersion;
  } catch (e) {
    if (spinner) spinner();
    throw e;
  }
};

const getInstallTask = async (options = {}) => {
  const result = await npm.install(options);
  const svrxRoot = path.resolve(options.path, 'node_modules/svrx');
  const destFolder = path.resolve(options.VERSIONS_ROOT, result.version);
  const destFolderDependency = path.resolve(options.VERSIONS_ROOT, result.version, 'node_modules');

  return new Promise((resolve) => {
    fs.copySync(svrxRoot, destFolder);
    fs.copySync(path.resolve(options.path, 'node_modules'), destFolderDependency);
    resolve(options.version);
  });
};

module.exports = {
  getInstallTask,
  install,
  getVersions,
  getTags,
};
