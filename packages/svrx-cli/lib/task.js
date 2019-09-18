const { getInstallTask } = require('./registry');

function sendAfterClose(ret) {
  process.send(ret);
  process.exit(0);
}

process.on('message', (param) => {
  getInstallTask(param)
    .then((ret) => {
      sendAfterClose(ret);
    })
    .catch((e) => {
      sendAfterClose({
        type: 'error',
        error: e.message,
      });
    });
});
