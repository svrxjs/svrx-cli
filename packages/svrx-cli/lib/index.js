// const path = require('path');
const { logger } = require('@svrx/util');
const config = require('./config');
const local = require('./local');
const registry = require('./registry');

class Manager {
  constructor() {
    this.Manager = Manager;
    try {
      config.createDirs();
    } catch (e) {
      logger.error(e);
      process.exit(1);
    }
  }

  loadConfigFile() {
    if (this.loaded) return;
    try {
      config.loadFile();
    } catch (e) {
      logger.error(`Config file reading failed: ${e}`);
    }
    this.loaded = true;
  }

  static async loadSvrx(optionsFromCli = {}, inlineOptions = {}) {
    const cliVersion = optionsFromCli.svrx;
    const rcVersion = config.getConfig().svrx;
    // use the latest version in local if no version supplied
    const version = cliVersion || rcVersion || (await local.getLatestVersion());

    if (!version || !local.exists(version)) {
      const installedVersion = await registry.install(version);
      return local.load(installedVersion, optionsFromCli, inlineOptions);
    }
    return local.load(version, optionsFromCli, inlineOptions);
  }

  static getLocalVersions() {
    return local.getVersions();
  }

  static async getRemoteVersions() {
    return registry.getVersions();
  }

  static async getRemoteTags() {
    return registry.getTags();
  }

  static async install(version, options = {}) {
    return registry.install(version, options);
  }
}

module.exports = Manager;
