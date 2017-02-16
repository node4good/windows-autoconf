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

function getVS2017Path (hostBits, target_arch, bindings) {
  setBindings(bindings)
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


module.exports = {
  try_powershell_path,
  compile_run_path,
  try_registry_path,
  setBindings,
  getVS2017Setup,
  getVS2017Path,
  locateMsbuild,
  _forTesting: {tryVS7_powershell, tryVS7_CSC, tryVS7_registry}

}
