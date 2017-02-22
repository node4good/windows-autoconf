'use strict'
/**
 * @namespace vsSetup
 * @property {String} Product
 * @property {String} InstallationPath
 * @property {String} SDKFull
 * @property {String} SDK
 * @property {String} CmdPath
 * @property {String} Version
 * @property {String} RegistryVersion
 */

const lazy = {
  _patched: false,
  _bindings: null,
  get isDebug () {return (this._bindings.process.env['DEBUG'] || '').split(',').includes('autoconf')},
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
    if (this.isDebug && !this._patched) {
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
  debug(...args) {if (this.isDebug) this.bindings.log(...args)},
  debugDir(arg) {
    if (this.isDebug) {
      const util = require('util')
      console.log('=============\n%s\n=============', util.inspect(arg, {colors: true}))
    }
  }
}

function setBindings (bindings) {
  lazy._bindings = bindings
}

function tryVS7_powershell () {
  try {
    const vsSetupRaw = lazy.bindings.execSync(module.exports.try_powershell_path).toString()
    if (!vsSetupRaw) return
    const vsSetup = JSON.parse(vsSetupRaw)[0]
    return vsSetup
  } catch (e) {
    lazy.bindings.log('Couldn\'t find VS7 with powershell')
  }
}

function tryVS7_CSC () {
  try {
    const vsSetupRaw = lazy.bindings.execSync(module.exports.compile_run_path).toString()
    if (!vsSetupRaw) return
    const vsSetup = JSON.parse(vsSetupRaw)[0]
    return vsSetup
  } catch (e) {
    lazy.bindings.log('Couldn\'t find VS7 with a compiled exe')
  }
}

function tryVS7_registry () {
  try {
    const vsSetupRaw = lazy.bindings.execSync(module.exports.try_registry_path).toString()
    if (vsSetupRaw.includes('ERROR')) {
      lazy.bindings.log('Couldn\'t find VS7 in registry:(')
      return
    }
    const vsSetups = JSON.parse(vsSetupRaw)
    const vsSetup = vsSetups.find(i => Number(i.RegistryVersion) === 15.0)
    if (!vsSetup) return
    lazy.debugDir(vsSetup)
    if (!lazy.bindings.fs.existsSync(vsSetup.CmdPath)) return

    const reg = lazy.bindings.execSync(`"${vsSetup.CmdPath}" /nologo & set`).toString().trim().split(/\r?\n/g)
    vsSetup.SDKFull = reg.find(l => l.includes('WindowsSDKVersion')).split('=').pop().replace('\\', '')
    vsSetup.Version = reg.find(l => l.includes('VCToolsInstallDir')).replace(/.*?\\([\d.]{5,})\\.*/, '$1')
    vsSetup.SDK = vsSetup.SDKFull.replace(/\d+$/, '0')
    vsSetup.Product = vsSetup.InstallationPath.split('\\').slice(-2, -1)[0]
    return vsSetup
  } catch (e) {
    lazy.bindings.log('Couldn\'t find VS7 via the registry')
  }
}

function getVS2017Setup () {
  if ('cache2017' in getVS2017Setup) return getVS2017Setup.cache2017
  const vsSetupViaCom = tryVS7_powershell() || tryVS7_CSC()
  const vsSetup = (vsSetupViaCom === 'No COM') ? tryVS7_registry() : vsSetupViaCom
  getVS2017Setup.cache2017 = vsSetup
  return vsSetup
}

function locateMsbuild () {
  const vsSetup = getVS2017Setup()
  const msbuild_location = lazy.bindings.path.join(
    vsSetup.InstallationPath, 'MSBuild', '15.0', 'Bin', 'MSBuild.exe'
  )
  return msbuild_location
}

let msvs2017
function getMSVSSetup (version) {
  if ('cacheSetup' in getMSVSSetup) return getMSVSSetup.cacheSetup
  const env = lazy.bindings.process.env
  if (!version)
    version = env['GYP_MSVS_VERSION'] || 'auto'

  let setup = getVS2017Setup()
  if (version === '2017' || (version === 'auto' && setup && setup.InstallationPath)) {
    setup.version = '2017'
  } else if (version === '2015' || version === 'auto' && env['VS140COMNTOOLS']) {
    setup = {version: '2015', CommonTools: env['VS140COMNTOOLS']}
  } else if (version === '2013' || version === 'auto' && env['VS120COMNTOOLS']) {
    setup = {version: '2013', CommonTools: env['VS120COMNTOOLS']}
  } else if (version === '2012' || version === 'auto' && env['VS110COMNTOOLS']) {
    setup = {version: '2012', CommonTools: env['VS110COMNTOOLS']}
  } else if (version === '2010' || version === 'auto' && env['VS100COMNTOOLS']) {
    setup = {version: '2010', CommonTools: env['VS100COMNTOOLS']}
  } else {
    setup = {version, InstallationPath: ''}
  }
  if (setup.CommonTools) {
    setup.InstallationPath = lazy.bindings.path.join(setup.CommonTools, '..', '..')
  }
  getMSVSSetup.cacheSetup = setup
  return setup
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

function getWithFullCmd (target_arch) {
  let setup = getMSVSSetup()
  setup.target_arch = target_arch
  setup.hostBits = getOSBits()

  if (setup.version === 'auto') throw new Error('No Visual Studio found. Try to run from an MSVS console')
  // NOTE: Largely inspired by `GYP`::MSVSVersion.py
  if (setup.version === '2017') {
    const argArch = target_arch === 'x64' ? 'amd64' : target_arch === 'ia32' ? 'x86' : new Error(`Arch: '${target_arch}' is not supported`)
    if (argArch instanceof Error) throw argArch
    const argHost = setup.hostBits === 64 ? 'amd64' : 'x86'
    setup.FullCmd = `${setup.CmdPath} -arch=${argArch} -host_arch=${argHost} -no_logo`
  } else {
    let cmdPathParts
    let arg
    setup.effectiveBits = setup.InstallationPath.includes('(x86)') ? 32 : setup.hostBits
    if (target_arch === 'ia32') {
      if (setup.effectiveBits === 64) {
        cmdPathParts = ['VC', 'vcvarsall.bat']
        arg = 'amd64_x86'
      } else {
        cmdPathParts = ['Common7', 'Tools', 'vsvars32.bat']
        arg = ''
      }
    } else if (target_arch === 'x64') {
      cmdPathParts = ['VC', 'vcvarsall.bat']
      arg = setup.effectiveBits === 64 ? 'amd64' : 'x86_amd64'
    } else {
      throw new Error(`Arch: '${target_arch}' is not supported`)
    }
    setup.CmdPath = lazy.bindings.path.join(setup.InstallationPath, ...cmdPathParts)
    setup.FullCmd = `"${setup.CmdPath}" ${arg}`
  }
  return setup
}

function findVcVarsFile (target_arch) {
  let setup = getWithFullCmd(target_arch)
  if (setup.version === 'auto') throw new Error('No Visual Studio found. Try to run from an MSVS console')
  return setup.FullCmd
}

function resolveDevEnvironment_inner (setup) {
  const vcEnvCmd = setup.FullCmd
  const pre = lazy.bindings.execSync('set').toString().trim().split(/\r\n/g)
  const preSet = new Set(pre)
  const rawLines = lazy.bindings.execSync(`${vcEnvCmd} & set`, {env: {}}).toString().trim().split(/\r\n/g)
  const hasFail = rawLines.slice(0, 2).some(l => l.includes('missing') || l.includes('not be installed'))
  if (hasFail) {
    //noinspection ExceptionCaughtLocallyJS
    throw new Error('Visual studio tools for C++ where not installed for ' + target_arch)
  }
  const lines = rawLines.filter(l => !preSet.has(l))
  const env = lines.reduce((s, l) => {
    const kv = l.split('=')
    s[kv[0]] = kv[1]
    return s
  }, {})

  return env
}

function resolveDevEnvironment (target_arch) {
  const setup = getWithFullCmd(target_arch)
  lazy.debugDir(setup)
  const cacheKey = setup.FullCmd.replace(/\s|\\|\/|:|=|"/g, '')
  const cacheName = lazy.bindings.path.join(__dirname, `_${cacheKey}${setup.Version}.json`)
  if (lazy.bindings.fs.existsSync(cacheName)) {
    const file = lazy.bindings.fs.readFileSync(cacheName)
    const ret = JSON.parse(file)
    lazy.debug('cache hit')
    lazy.debugDir(ret)
    return ret
  } else {
    const env = resolveDevEnvironment_inner(setup)
    const file = JSON.stringify(env)
    lazy.bindings.fs.writeFileSync(cacheName, file)
    lazy.debug('actual resolution')
    lazy.debugDir(env)
    return env
  }
}

module.exports = {
  try_powershell_path: `"${__dirname}\\tools\\try_powershell.cmd"`,
  compile_run_path: `"${__dirname}\\tools\\compile-run.cmd"`,
  try_registry_path: `"${__dirname}\\tools\\try_registry.cmd"`,
  setBindings,
  getVS2017Setup,
  getVS2017Path: (_, arch) => findVcVarsFile(arch),
  locateMsbuild,
  getMSVSVersion: (version) => getMSVSSetup(version).version,
  getOSBits,
  findOldVcVarsFile: (_, arch) => findVcVarsFile(arch),
  resolveDevEnvironment,
  _forTesting: {tryVS7_powershell, tryVS7_CSC, tryVS7_registry, getWithFullCmd}
}
