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
 * @param options
 * @returns {Promise<*>}
 */
const install = async (version, options = {}) => {
  const spinner = options.silent ? null : logger.progress('Installing svrx core package...');
  const task = fork(path.join(__dirname, './task.js'), {
    silent: true,
  });

  try {
    const installedVersion = await new Promise((resolve, reject) => {
      task.on('error', reject);
      task.on('message', (ret) => {
        if (ret.error) reject(new Error(ret.error));
        else resolve(ret);
      });
      task.send({ version, versionsRoot: config.VERSIONS_ROOT });
    });
    if (spinner) spinner();
    return installedVersion;
  } catch (e) {
    if (spinner) spinner();
    throw e;
  }
};

const getInstallTask = async ({ version, versionsRoot }) => {
  const versions = await getVersions();
  versions.reverse();

  const installVersion = version || versions[0];

  if (local.exists(installVersion, versionsRoot)) return installVersion; // already installed

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
  };

  const result = await npm.install(options);
  const svrxRoot = path.resolve(tmpPath, 'node_modules/svrx');
  const destFolder = path.resolve(versionsRoot, result.version);
  const destFolderDependency = path.resolve(versionsRoot, result.version, 'node_modules');

  return new Promise((resolve) => {
    fs.copySync(svrxRoot, destFolder);
    fs.copySync(path.resolve(tmpPath, 'node_modules'), destFolderDependency);
    resolve(installVersion);
  });
};

module.exports = {
  getInstallTask,
  install,
  getVersions,
  getTags,
};
