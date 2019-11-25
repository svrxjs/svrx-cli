const { PackageManagerCreator } = require('@svrx/util');
const { npm, logger } = require('@svrx/util');
const _ = require('lodash');

const getVersions = async () => {
  const spinner = logger.progress('Searching versions...');
  try {
    const result = await npm.view(['@svrx/svrx', 'versions']);
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
    const result = await npm.view(['@svrx/svrx', 'dist-tags']);
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
  const { silent, path } = options;
  const spinner = silent ? null : logger.progress('Installing svrx core package...');

  try {
    const pm = PackageManagerCreator({
      path,
      version,
    });
    const pkg = await pm.load();
    if (spinner) spinner();
    return pkg.version;
  } catch (e) {
    if (spinner) spinner();
    throw e;
  }
};

module.exports = {
  install,
  getVersions,
  getTags,
};
