#!/usr/bin/env node
/* eslint-disable no-console */
const os = require('os');
const parse = require('yargs-parser');
const { PackageManagerCreator, logger, rcFileRead } = require('@svrx/util');
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const PAD_START = 4;
const PAD_END = 20;
const printErrorAndExit = (error) => {
  logger.error(error);
  process.exit(1);
};

// cli option parse
const options = parse(process.argv.slice(2));
const cmds = options._;
delete options._;

// svrx config file option read
const rcOptions = rcFileRead();

// command prepare
const pm = PackageManagerCreator({
  version: options.svrx || rcOptions.svrx,
  path: options.path || rcOptions.path,
});
const prepareSvrx = async () => {
  const spinner = logger.spin('Loading svrx...');
  try {
    const svrxPkg = await pm.load();
    const Svrx = svrxPkg.module;
    if (spinner) spinner();
    return new Svrx({}, options);
  } catch (e) {
    if (spinner) spinner();
    printErrorAndExit(e);
    return null;
  }
};
const commands = {
  ls: {
    description: 'List versions of svrx core and plugins installed locally',
    exec: async () => {
      try {
        const versions = pm.getLocalPackages();
        if (versions && versions.length > 0) {
          const versionStrs = versions.map((v) => v.version);
          console.log('svrx Versions Installed:\n');
          console.log(versionStrs.join(', '), '\n');
        } else {
          console.log('There is no svrx installed.\n');
          console.log('You can install the latest version through: "svrx install".\n');
        }

        const plugins = pm.getLocalPlugins();
        if (plugins && plugins.length > 0) {
          console.log('svrx Plugins Installed:\n');
          plugins.forEach((p) => {
            console.log(`${p.name}: ${p.versions.join(', ')}`);
          });
        }
      } catch (e) {
        printErrorAndExit(e);
      }
    },
  },
  'ls-remote': {
    description: 'List remote svrx core versions available for install',
    exec: async () => {
      const spinner = logger.spin('Searching for available versions...');
      try {
        const versions = await pm.getRemotePackages();
        if (spinner) spinner();

        console.log('Available Svrx Versions:\n');
        console.log(versions.map((v) => v.version).join(', '));
      } catch (e) {
        if (spinner) spinner();
        printErrorAndExit(e);
      }
    },
  },
  install: {
    description: 'Download and install a specific < version > of svrx core ',
    exec: async (params = []) => {
      const version = cmds.length > 0 ? params[0] : undefined;
      const spinner = logger.spin('Installing svrx core package...');
      try {
        pm.set('version', version);
        const installedPkg = await pm.load();
        if (spinner) spinner();
        logger.notify(`Successfully installed svrx@${installedPkg.version}`);
      } catch (e) {
        if (spinner) spinner();
        printErrorAndExit(e);
      }
    },
  },
  remove: {
    description: `Remove local packages of svrx core or plugins. eg: 
                              svrx remove 1.0.0 (remove a core package)
                              svrx remove webpack (remove a plugin)
                              svrx remove webpack/1.0.0 
                              svrx remove ALL (to remove all packages of svrx core and plugins)
                              svrx remove CORE (to remove all packages of svrx core)
                              svrx remove PLUGIN (to remove all packages of svrx plugins)`,
    exec: async (params = []) => {
      const packageToRemove = cmds.length > 0 ? params[0] : undefined;

      if (!packageToRemove) {
        logger.notify('Please specific a package to remove, eg: svrx remove 1.0.0, svrx remove webpack');
        return;
      }

      const name = packageToRemove === '*' ? 'all packages' : packageToRemove;
      const spinner = logger.spin(`Removing ${name}...`);
      try {
        const isSuccess = await pm.remove(packageToRemove);
        if (spinner) spinner();
        if (isSuccess) {
          logger.notify(`Successfully removed ${name} from local`);
        } else {
          logger.error('There\'s no such a directory to remove');
        }
      } catch (e) {
        if (spinner) spinner();
        printErrorAndExit(e);
      }
    },
  },
  serve: {
    description: 'Start a develop server. This is the default command',
    exec: async () => {
      const svrx = await prepareSvrx();
      svrx.start();
    },
  },
};

// version
const version = async () => {
  const svrx = await prepareSvrx();

  console.log('CLI version:', require('../package').version); // eslint-disable-line
  console.log('Svrx version:', svrx.Svrx.getCurrentVersion());
  console.log('Node version:', process.version);
  console.log('OS version:', `${os.type()} ${os.release()} ${os.arch()}`);
  process.exit(0);
};
// help
const help = async (cmd) => {
  const svrx = await prepareSvrx();
  const single = cmd && commands[cmd];

  console.log('Usage: svrx [<command>] [options]\n');

  if (!single) {
    console.log('Options:\n');
    console.log(
      ''.padEnd(PAD_START),
      '-v, --version'.padEnd(PAD_END),
      'Version info of cli and currently used svrx',
    );
    console.log(
      ''.padEnd(PAD_START),
      '-h, --help'.padEnd(PAD_END),
      'Help info',
    );
  }

  console.log('\nCommands:\n');
  if (single) {
    console.log(
      ''.padEnd(PAD_START),
      cmd.padEnd(PAD_END),
      commands[cmd].description,
    );
  } else { // print all
    Object.keys(commands).forEach((c) => {
      console.log(
        ''.padEnd(PAD_START),
        c === 'serve' ? 'serve [default]'.padEnd(PAD_END) : c.padEnd(PAD_END),
        commands[c].description,
      );
    });
  }

  // help info of command:serve
  if (!single || cmd === 'serve') {
    svrx.Svrx.printBuiltinOptionsHelp();
  }
  process.exit(0);
};


if (options.h || options.help) {
  help(cmds.length > 0 ? cmds[0] : null);
} else if (options.v || options.version) {
  version();
} else {
  const cmd = cmds.length > 0 ? cmds[0] : 'serve'; // default cmd is 'serve'
  if (commands[cmd]) {
    commands[cmd].exec(cmds.slice(1)).then(() => {
      if (cmd !== 'serve') {
        process.exit(0); // fix quit on windows
      }
    });
  } else {
    help();
  }
}

// cli update alert
updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 * 7, // 1 week
}).notify();

if (process.platform === 'win32') {
  const rl = require('readline').createInterface({ // eslint-disable-line
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
  rl.on('SIGTERM', () => {
    process.emit('SIGTERM');
  });
}

process.on('SIGINT', () => {
  process.exit();
});
process.on('SIGTERM', () => {
  process.exit();
});
