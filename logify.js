'use strict';

var through = require('through2')
  , falafel = require('falafel');

module.exports = function (file) {
  if (/\.json$/.test(file)) {
    return through();
  }
  var data = '';
  return through(
    function (buf, enc, cb) {
      data += buf;
      cb();
    },
    function (cb) {
      try {
        this.push(String(parse(data)));
      } catch (er) {
        cb(new Error(er.toString().replace('Error: ', '') + ' (' + file + ')'));
      }
      cb();
    }
  );
};

function parse(data) {
  return falafel(data, function (node) {
    if (node.type !== 'DebuggerStatement' &&
      (node.type !== 'CallExpression' || !isConsoleLog(node.callee))) {
      return;
    }
    node.update(
        node.source() + ';' +
        node.source().replace(
          /console\.(log|debug|info|warn|error)/,
          "require('logger').$1"
        )
    );
  });
}

function isConsoleLog(node) {
  return isConsole(node) && isLog(node.property);
}

function isConsole(node) {
  if (!node) {
    return false;
  }
  if (node.type !== 'MemberExpression') {
    return false;
  }
  return node.object.type === 'Identifier' && node.object.name === 'console';
}

var consoleApi = [
  'debug',
  'error',
  'info',
  'log',
  'trace',
  'warn'
];

function isLog(node) {
  return node.type === 'Identifier' && (consoleApi.indexOf(node.name) > -1);
}

