'use strict'
/**
 * @namespace vsSetup
 * @property {String} InstallationPath
 * @property {String} SDK
 * @property {String} CmdPath
 */


const try_powershell_path = __dirname + '\\tools\\try_powershell.cmd'
const compile_run_path = __dirname + '\\tools\\compile-run.cmd'
const try_registry_path = __dirname + '\\tools\\try_registry.cmd'

const lazy = {
  _bindings: null,
  get bindings () {
    if (!this._bindings) {
      this._bindings = {
        path: require('path'),
        log: console.log.bind(console),
        error: console.error.bind(console),
        execSync: require('child_process').execSync
      }
    }
    return this._bindings
  },
}


function setBindings (bindings) {
  lazy._bindings = bindings;
}


function parseCmdOutput (str) {
  return str
    .trim()
    .split(/[\r|\n]/g)
    .reduce((s, l) => {
      const lParts = l.split(': ')
      if (lParts.length > 1) s[lParts[0]] = lParts[1]
      return s
    }, {})
}

function
tryVS7_powershell () {
  try {
    const vsSetupRaw = lazy.bindings.execSync(try_powershell_path).toString()
    if (!vsSetupRaw) return
    const vsSetup = parseCmdOutput(vsSetupRaw)
    return vsSetup
  } catch (e) {
    lazy.bindings.log('Couldn\'t find VS7 with powershell', e.message)
  }
}

function tryVS7_CSC () {
  try {
    const vsSetupRaw = lazy.bindings.execSync(compile_run_path).toString()
    if (!vsSetupRaw) return
    const vsSetup = parseCmdOutput(vsSetupRaw)
    return vsSetup
  } catch (e) {
    lazy.bindings.log('Couldn\'t find VS7 with a compiled exe', e.message)
  }
}

function tryVS7_registry () {
  const vsSetupRaw = lazy.bindings.execSync(try_registry_path).toString()
  if (vsSetupRaw.includes('ERROR')) {
    lazy.bindings.log('Couldn\'t find VS7 in registry:(')
    return
  }
  const vsSetup = parseCmdOutput(vsSetupRaw)
  return vsSetup
}


function getVS2017Setup () {
  const vsSetup = tryVS7_powershell() || tryVS7_CSC() || tryVS7_registry()
  if (!vsSetup) {
    throw new Error('Couldn\'t find VS7 :(')
  }
  return vsSetup
}

function getVS2017Path (hostBits, target_arch) {
  const vsSetup = getVS2017Setup()
  const argArch = target_arch === 'x64' ? 'amd64' : 'x86'
  const argHost = hostBits === 64 ? 'amd64' : 'x86'
  return `${vsSetup.CmdPath} -arch=${argArch} -host_arch=${argHost} -no_logo`
}


function locateMsbuild () {
  const vsSetup = getVS2017Setup()
  const msbuild_location = lazy.bindings.path.join(vsSetup.InstallationPath, 'MSBuild',
    '15.0', 'Bin', 'MSBuild.exe')
  return msbuild_location;
}

function getMSVSVersion (version) {
  const env = process.env;

  if (!version)
    version = env['GYP_MSVS_VERSION'] || 'auto';

  // Try to find a MSVS installation
  if (version === 'auto' && env['VS140COMNTOOLS'] || version === '2015')
    return '2015';
  if (version === 'auto' && env['VS120COMNTOOLS'] || version === '2013')
    return '2013';
  if (version === 'auto' && env['VS100COMNTOOLS'] || version === '2010')
    return '2010';
  if (version === '2010' || version === 'auto' && getVS2017Setup().InstallationPath)
    return '2017'

  return 'auto';
}


function getOSBits () {
  const env = process.env;

  // PROCESSOR_ARCHITEW6432 - is a system arch
  // PROCESSOR_ARCHITECTURE - is a session arch
  const hostArch = env['PROCESSOR_ARCHITEW6432'] ||
    env['PROCESSOR_ARCHITECTURE'];
  if (hostArch === 'AMD64')
    return 64;
  else
    return 32;
}


function findOldVcVarsFile (hostBits, target_arch) {
  // NOTE: Largely inspired by MSVSVersion.py
  const env = process.env;
  let version = getMSVSVersion();

  let tools;
  // Try to find a MSVS installation
  if (version === 'auto' && env['VS140COMNTOOLS'] || version === '2015') {
    version = '2015';
    tools = lazy.bindings.path.join(env.VS140COMNTOOLS, '..', '..');
  }
  if (version === 'auto' && env['VS120COMNTOOLS'] || version === '2013') {
    version = '2013';
    tools = lazy.bindings.path.join(env.VS120COMNTOOLS, '..', '..');
  }
  // TODO(indutny): more versions?
  if (version === 'auto' && env['VS100COMNTOOLS'] || version === '2010') {
    version = '2010';
    tools = lazy.bindings.path.join(env.VS120COMNTOOLS, '..', '..');
  }
  // TODO(indutny): does it work with MSVS Express?

  if (version === 'auto') {
    throw new Error('No Visual Studio found. When building - please ' +
      'run `ninja` from the MSVS console');
  }

  let vcEnvCmd;
  // TODO(indutny): proper escape for the .bat file
  if (target_arch === 'ia32') {
    if (hostBits === 64)
      vcEnvCmd = '"' + lazy.bindings.path.join(tools, 'VC', 'vcvarsall.bat') + '" amd64_x86';
    else
      vcEnvCmd = '"'
        + lazy.bindings.path.join(tools, 'Common7', 'Tools', 'vsvars32.bat')
        + '"';
  } else if (target_arch === 'x64') {
    let arg;
    if (hostBits === 64)
      arg = 'amd64';
    else
      arg = 'x86_amd64';
    vcEnvCmd = '"' + lazy.bindings.path.join(tools, 'VC', 'vcvarsall.bat') + '" ' + arg;
  } else {
    throw new Error(`Arch: '${target_arch}' is not supported on windows`);
  }
  return vcEnvCmd;
}

function resolveDevEnvironment (target_arch) {
  const hostBits = getOSBits();

  const vcEnvCmd = getVS2017Path(hostBits, target_arch) ||
    findOldVcVarsFile(hostBits, target_arch);
  let lines = [];
  try {
    const pre = lazy.bindings.execSync('set').toString()
      .trim().split(/\r\n/g);
    const preSet = new Set(pre);
    const rawLines = lazy.bindings.execSync(`${vcEnvCmd} & set`, {env: {}})
      .toString()
      .trim()
      .split(/\r\n/g);
    lines = rawLines.filter(l => !preSet.has(l));
  } catch (e) {
    lazy.bindings.error(e.message);
  }
  const env = lines.reduce((s, l) => {
    const kv = l.split('=');
    s[kv[0]] = kv[1];
    return s;
  }, {});

  return env;
}


module.exports = {
  try_powershell_path,
  compile_run_path,
  try_registry_path,
  setBindings,
  getVS2017Setup,
  getVS2017Path,
  locateMsbuild,
  getMSVSVersion,
  getOSBits,
  findOldVcVarsFile,
  resolveDevEnvironment,
  _forTesting: {tryVS7_powershell, tryVS7_CSC, tryVS7_registry}
}
