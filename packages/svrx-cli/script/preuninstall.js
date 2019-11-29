const { logger, PackageManagerCreator } = require('@svrx/util');

const removeSvrx = async () => {
  try {
    const pm = PackageManagerCreator();
    await pm.remove('ALL');
    logger.notify('Successfully removed all cache of svrx from local. See you!');
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
};

removeSvrx();
