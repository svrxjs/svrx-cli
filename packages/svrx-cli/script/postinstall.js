const { logger } = require('@svrx/util');
const Manager = require('../lib');


const installSvrx = async () => {
  try {
    const manager = new Manager();
    await manager.Manager.install();
    logger.notify('Successfully installed the latest version of svrx');
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
};

installSvrx();
