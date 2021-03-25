const { PackageManagerCreator, logger } = require('@svrx/util');

const installSvrx = async () => {
  const spinner = logger.spin('Installing svrx core...');
  try {
    const pm = PackageManagerCreator({});
    const svrxPkg = await pm.load();
    if (spinner) spinner();
    logger.notify(`Successfully installed svrx@${svrxPkg.version}`);
  } catch (e) {
    if (spinner) spinner();
    logger.error(e);
    process.exit(1);
  }
};

installSvrx();
