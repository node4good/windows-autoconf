'use strict'
/**
 * @namespace vsSetup
 * @property {String} Product
 * @property {String} InstallationPath
 * @property {String} SDK
 * @property {String} CmdPath
 * @property {String} Version
 * @property {String} RegistryVersion
 */

const try_powershell_path = __dirname + '\\tools\\try_powershell.cmd'
const compile_run_path = __dirname + '\\tools\\compile-run.cmd'
const try_registry_path = __dirname + '\\tools\\try_registry.cmd'
const lazy = {
  _patched: false,
  _bindings: null,
  get bindings () {
    if (!this._bindings) {
      this._bindings = {
        fs: require('fs'),
        path: require('path'),
        log: console.log.bind(console),
        error: console.error.bind(console),
        execSync: require('child_process').execSync,
        process: process
      }
    }
    const IS_DEBUG = (this._bindings.process.env['DEBUG'] || '').split(',').includes('autoconf')
    if (IS_DEBUG && !this._patched) {
      this._patched = true
      this._bindings._execSync = this._bindings.execSync
      this._bindings.execSync = (cmd, options) => {
        this._bindings.log(`==== CMD ====\n${cmd}\n=============`)
        const ret = this._bindings._execSync(cmd, options)
        this._bindings.log(`${ret}\n=============`)
        return ret
      }
    }
    return this._bindings
  },
}

function setBindings (bindings) {
  lazy._bindings = bindings
}

function tryVS7_powershell () {
  try {
    const vsSetupRaw = lazy.bindings.execSync(try_powershell_path).toString()
    if (!vsSetupRaw) return
    const vsSetup = JSON.parse(vsSetupRaw)[0]
    return vsSetup
  } catch (e) {
    lazy.bindings.log('Couldn\'t find VS7 with powershell', e.message)
  }
}

function tryVS7_CSC () {
  try {
    const vsSetupRaw = lazy.bindings.execSync(compile_run_path).toString()
    if (!vsSetupRaw) return
    const vsSetup = JSON.parse(vsSetupRaw)[0]
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
  const vsSetup = JSON.parse(vsSetupRaw)[0]
  return vsSetup
}

function getVS2017Setup () {
  const vsSetup = tryVS7_powershell() || tryVS7_CSC() || tryVS7_registry()
  if (!vsSetup) {
    throw new Error('Couldn\'t find VS7 :(')
  }
  return vsSetup
}

function formatFull2017Cmd (vsSetup, hostBits, target_arch) {
  const argArch = target_arch === 'x64' ? 'amd64' : 'x86'
  const argHost = hostBits === 64 ? 'amd64' : 'x86'
  return `${vsSetup.CmdPath} -arch=${argArch} -host_arch=${argHost} -no_logo`
}

function getVS2017Path (hostBits, target_arch) {
  const vsSetup = getVS2017Setup()
  return formatFull2017Cmd(vsSetup, hostBits, target_arch)
}

function locateMsbuild () {
  const vsSetup = getVS2017Setup()
  const msbuild_location = lazy.bindings.path.join(
    vsSetup.InstallationPath, 'MSBuild', '15.0', 'Bin', 'MSBuild.exe'
  )
  return msbuild_location
}

function getMSVSSetup (version) {
  const env = lazy.bindings.process.env
  if (!version)
    version = env['GYP_MSVS_VERSION'] || 'auto'

  let setup = getVS2017Setup()
  if (version === '2017' || (version === 'auto' && setup && setup.InstallationPath)) {
    setup.version = '2017'
  } else if (version === 'auto' && env['VS140COMNTOOLS'] || version === '2015') {
    setup = {version: '2015', CommonTools: env['VS140COMNTOOLS']}
  } else if (version === 'auto' && env['VS120COMNTOOLS'] || version === '2013') {
    setup = {version: '2013', CommonTools: env['VS120COMNTOOLS']}
  } else if (version === 'auto' && env['VS100COMNTOOLS'] || version === '2010') {
    setup = {version: '2010', CommonTools: env['VS100COMNTOOLS']}
  } else {
    setup = {version, InstallationPath: ''}
  }
  if (setup.CommonTools) {
    setup.InstallationPath = lazy.bindings.path.join(setup.CommonTools, '..', '..')
  }

  return setup
}

function getMSVSVersion (version) {
  return getMSVSSetup(version).version
}

function getOSBits () {
  const env = lazy.bindings.process.env

  // PROCESSOR_ARCHITEW6432 - is a system arch
  // PROCESSOR_ARCHITECTURE - is a session arch
  const hostArch = env['PROCESSOR_ARCHITEW6432'] || env['PROCESSOR_ARCHITECTURE']
  if (hostArch === 'AMD64')
    return 64
  else
    return 32
}

function findOldVcVarsFile (hostBits, target_arch) {
  // NOTE: Largely inspired by `GYP`::MSVSVersion.py
  let setup = getMSVSSetup()
  if (setup.version === 'auto') throw new Error('No Visual Studio found. Try to run from an MSVS console')

  if (setup.version === '2017') {
    return formatFull2017Cmd(setup, hostBits, target_arch)
  }

  let cmdPathParts
  let arg
  if (target_arch === 'ia32') {
    if (hostBits === 64) {
      cmdPathParts = ['VC', 'vcvarsall.bat']
      arg = 'amd64_x86'
    } else {
      cmdPathParts = ['Common7', 'Tools', 'vsvars32.bat']
      arg = ''
    }
  } else if (target_arch === 'x64') {
    cmdPathParts = ['VC', 'vcvarsall.bat']
    arg = hostBits === 64 ? 'amd64' : 'x86_amd64'
  } else {
    throw new Error(`Arch: '${target_arch}' is not supported on windows`)
  }
  return `"${lazy.bindings.path.join(setup.InstallationPath, ...cmdPathParts)}" ${arg}`
}

function resolveDevEnvironment (target_arch) {
  const hostBits = getOSBits()
  const vcEnvCmd = findOldVcVarsFile(hostBits, target_arch)
  let lines = []
  try {
    const pre = lazy.bindings.execSync('set').toString().trim().split(/\r\n/g)
    const preSet = new Set(pre)
    const rawLines = lazy.bindings.execSync(`${vcEnvCmd} & set`, {env: {}}).toString().trim().split(/\r\n/g)
    lines = rawLines.filter(l => !preSet.has(l))
  } catch (e) {
    lazy.bindings.error(e.message)
  }
  const env = lines.reduce((s, l) => {
    const kv = l.split('=')
    s[kv[0]] = kv[1]
    return s
  }, {})

  return env
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
