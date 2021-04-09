'use strict';
const common = require('../common');

common.skipIfInspectorDisabled();

const fixtures = require('../common/fixtures');
const startCLI = require('../common/inspector-cli');

const assert = require('assert');
const { spawn } = require('child_process');


function launchTarget(...args) {
  const childProc = spawn(process.execPath, args);
  return Promise.resolve(childProc);
}

{
  const script = fixtures.path('inspector-cli', 'alive.js');
  let cli = null;
  let target = null;

  function cleanup(error) {
    if (cli) {
      cli.quit();
      cli = null;
    }
    if (target) {
      target.kill();
      target = null;
    }
    assert.ifError(error);
  }

  return launchTarget(script)
    .then((childProc) => {
      target = childProc;
      cli = startCLI(['-p', `${target.pid}`]);
      return cli.waitForPrompt();
    })
    .then(() => cli.command('sb("alive.js", 3)'))
    .then(() => cli.waitFor(/break/))
    // TODO: There is a known issue on AIX and some other operating systems
    // where the breakpoints aren't properly resolved yet when we reach this
    // point. Eventually that should be figured out but for now we don't
    // want to fail builds because of it.
    // What it should be:
    //
    // .then(() => cli.waitForPrompt())
    //
    // What we're diong for now:
    .then(() => cli.waitFor(/>\s+(?:\n1 breakpoints restored\.)?$/))
    .then(() => {
      assert.match(
        cli.output,
        /> 3   \+\+x;/,
        'marks the 3rd line');
    })
    .then(() => cleanup())
    .then(null, cleanup);
}
