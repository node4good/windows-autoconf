'use strict'
/**
 * @namespace vsSetup
 * @property {String} Product
 * @property {String} Version
 * @property {Boolean} IsComplete
 * @property {Boolean} IsLaunchable
 * @property {String} CmdPath
 * @property {Object} MSBuild
 * @property {Object} VCTools
 * @property {Boolean} SDK8
 * @property {Object} SDK
 * @property {Array} Packages
 * @property {?String} RegistryVersion
 */
/**
 * @namespace lazy.bindings.fs.mkdirpSync
 */

const lazy = {
  _patched: false,
  _bindings: null,
  get isDebug () { return (this._bindings.process.env['DEBUG'] || '').split(',').includes('autoconf') },
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
      if (!('mkdirpSync' in this._bindings.fs)) {
        this._bindings.fs.mkdirpSync = this._bindings.fs.mkdirSync
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
  debug (...args) { if (this.isDebug) this.bindings.log(...args) },
  debugDir (arg) {
    if (this.isDebug) {
      const util = require('util')
      console.log('=============\n%s\n=============', util.inspect(arg, {colors: true}))
    }
  }
}

function setBindings (bindings) {
  lazy._bindings = bindings
}

function execAndParse (cmd) {
  const lines = lazy.bindings.execSync(cmd).toString().split(/\r?\n/g)
  const ret = lines.filter(l => l.slice(0, 4) === '    ').join('')
  const log = lines.filter(l => l.slice(0, 4) !== '    ').join('')
  const err = ['ERROR', log, ret]
  if (ret.includes('ERROR')) return err
  try {
    const setup = JSON.parse(ret)
    setup.log = log
    return setup
  } catch (e) {
    lazy.debug('====== ret =======')
    lazy.debug(ret)
    lazy.debug('====== log =======')
    lazy.debug(log)
    lazy.debug('==================')
    return err.concat([e])
  }
}

function checkSetup (setups) {
  if (setups && setups[0] === 'No COM') return
  setups.sort((a, b) => a.Version.localeCompare(b.Version)).reverse()
  const setup = setups.find(s => s.MSBuild && s.VCTools && (s.SDK || s.SDK8))
  return setup
}

function tryVS2017Powershell () {
  try {
    const vsSetups = execAndParse(module.exports.try_powershell_path)
    return checkSetup(vsSetups)
  } catch (e) {
    lazy.bindings.log('Couldn\'t find VS2017 with powershell')
  }
}

function tryVS2017CSC () {
  try {
    const vsSetups = execAndParse(module.exports.compile_run_path)
    return checkSetup(vsSetups)
  } catch (e) {
    lazy.bindings.log('Couldn\'t find VS2017 with a compiled exe')
  }
}

function tryVS2017Registry () {
  try {
    const vsSetupsRaw = execAndParse(module.exports.try_registry_path)
    if (vsSetupsRaw[0] === 'ERROR') {
      lazy.bindings.log('Couldn\'t find VS2017 in registry:(')
      return
    }
    vsSetupsRaw.sort((a, b) => a.localeCompare(b)).reverse()
    const vsSetup = vsSetupsRaw.find(i => Number(i.RegistryVersion) === 15.0)
    if (!vsSetup) return
    lazy.debugDir(vsSetup)
    if (!lazy.bindings.fs.existsSync(vsSetup.CmdPath)) return

    const reg = lazy.bindings.execSync(`"${vsSetup.CmdPath}" -no_logo & set`).toString().trim().split(/\r?\n/g)
    vsSetup.SDKFull = reg.find(l => l.includes('WindowsSDKVersion')).split('=').pop().replace('\\', '')
    vsSetup.Version = reg.find(l => l.includes('VCToolsInstallDir')).replace(/.*?\\([\d.]{5,})\\.*/, '$1')
    vsSetup.SDK = vsSetup.SDKFull.replace(/\d+$/, '0')
    vsSetup.Product = vsSetup.InstallationPath.split('\\').slice(-2, -1)[0]
    return vsSetup
  } catch (e) {
    lazy.bindings.log('Couldn\'t find VS2017 via the registry')
  }
}

function tryRegistrySDK () {
  try {
    const sdkSetups = execAndParse(module.exports.try_registry_sdk_path)
    const vers = sdkSetups.map(s => s['ProductVersion']).sort().reverse()
    const sdkSetup = sdkSetups.find(s => s['ProductVersion'] === vers[0])
    return sdkSetup
  } catch (e) {
    lazy.bindings.log('Couldn\'t find any SDK in registry')
  }
}

function tryRegistryMSBuild (ver) {
  try {
    const msbSetups = execAndParse(module.exports.try_registry_msbuild_path)
    const vers = msbSetups.map(s => s['ver'])
    ver = ver || Math.max.apply(null, vers)
    const msbSetup = msbSetups.find(s => s['ver'] === ver)
    return msbSetup
  } catch (e) {
    lazy.bindings.log('Couldn\'t find any SDK in registry')
  }
}

function getVS2017Setup () {
  if ('cache2017' in getVS2017Setup) return getVS2017Setup.cache2017
  const vsSetup = tryVS2017Powershell() || tryVS2017CSC() || tryVS2017Registry()
  getVS2017Setup.cache2017 = vsSetup
  return vsSetup
}

function locateMsbuild (ver) {
  const msbSetup = (ver && (ver in {2017: 1, auto: 1}) && locateMSBuild2017()) || tryRegistryMSBuild(ver)
  if (!msbSetup) {
    lazy.bindings.log('Can\'t find "msbuild.exe"')
    return
  }
  return msbSetup.MSBuildPath
}

function locateMSBuild2017 () {
  const vsSetup = getVS2017Setup()
  if (!vsSetup) return
  const ver = '15.0'
  const MSBuildToolsPath = lazy.bindings.path.join(vsSetup.InstallationPath, 'MSBuild', ver, 'Bin')
  const MSBuildPath = lazy.bindings.path.join(MSBuildToolsPath, 'MSBuild.exe')
  return {ver, MSBuildToolsPath, MSBuildPath}
}

function getMSVSSetup (version) {
  if ('cacheSetup' in getMSVSSetup) return getMSVSSetup.cacheSetup
  const env = lazy.bindings.process.env
  if (!version) { version = env['GYP_MSVS_VERSION'] || 'auto' }

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
  if (hostArch === 'AMD64') { return 64 } else { return 32 }
}

function getWithFullCmd (targetArch) {
  let setup = getMSVSSetup()
  setup.target_arch = targetArch
  setup.hostBits = getOSBits()

  if (setup.version === 'auto') throw new Error('No Visual Studio found. Try to run from an MSVS console')
  // NOTE: Largely inspired by `GYP`::MSVSVersion.py
  if (setup.version === '2017') {
    const argArch = targetArch === 'x64' ? 'amd64' : targetArch === 'ia32' ? 'x86' : new Error(`Arch: '${targetArch}' is not supported`)
    if (argArch instanceof Error) throw argArch
    const argHost = setup.hostBits === 64 ? 'amd64' : 'x86'
    setup.FullCmd = `${setup.CmdPath} -arch=${argArch} -host_arch=${argHost} -no_logo`
  } else {
    let cmdPathParts
    let arg
    setup.effectiveBits = setup.InstallationPath.includes('(x86)') ? 32 : setup.hostBits
    if (targetArch === 'ia32') {
      if (setup.effectiveBits === 64) {
        cmdPathParts = ['VC', 'vcvarsall.bat']
        arg = 'amd64_x86'
      } else {
        cmdPathParts = ['Common7', 'Tools', 'vsvars32.bat']
        arg = ''
      }
    } else if (targetArch === 'x64') {
      cmdPathParts = ['VC', 'vcvarsall.bat']
      arg = setup.effectiveBits === 64 ? 'amd64' : 'x86_amd64'
    } else {
      throw new Error(`Arch: '${targetArch}' is not supported`)
    }
    setup.CmdPath = lazy.bindings.path.join(setup.InstallationPath, ...cmdPathParts)
    setup.FullCmd = `"${setup.CmdPath}" ${arg}`
  }
  return setup
}

function findVcVarsFile (targetArch) {
  let setup = getWithFullCmd(targetArch)
  if (setup.version === 'auto') throw new Error('No Visual Studio found. Try to run from an MSVS console')
  return setup.FullCmd
}

function resolveDevEnvironmentInner (setup) {
  const vcEnvCmd = setup.FullCmd
  const pre = lazy.bindings.execSync('set').toString().trim().split(/\r\n/g)
  const preSet = new Set(pre)
  const rawLines = lazy.bindings.execSync(`${vcEnvCmd} & set`, {env: {}}).toString().trim().split(/\r\n/g)
  const hasFail = rawLines.slice(0, 2).some(l => l.includes('missing') || l.includes('not be installed'))
  if (hasFail) {
    // noinspection ExceptionCaughtLocallyJS
    throw new Error('Visual studio tools for C++ where not installed for ' + setup.target_arch)
  }
  const lines = rawLines.filter(l => !preSet.has(l))
  const env = lines.reduce((s, l) => {
    const kv = l.split('=')
    s[kv[0]] = kv[1]
    return s
  }, {})

  return env
}

function setupCache (cacheDir) {
  try {
    const ex = lazy.bindings.fs.existsSync(cacheDir)
    if (!ex) lazy.bindings.fs.mkdirpSync(cacheDir)
    const testFile = lazy.bindings.path.join(cacheDir, '.check')
    lazy.bindings.fs.writeFileSync(testFile, '')
    return true
  } catch (_) {
    return false
  }
}

function resolveDevEnvironment (targetArch) {
  const setup = getWithFullCmd(targetArch)
  lazy.debugDir(setup)
  const cacheKey = setup.FullCmd.replace(/\s|\\|\/|:|=|"/g, '')
  const env = lazy.bindings.process.env
  const cacheDir = lazy.bindings.path.join(env.HOME || env.USERPROFILE, '.autoconf')
  const cachable = setupCache(cacheDir)
  const cacheName = lazy.bindings.path.join(cacheDir, `_${cacheKey}${setup.Version}.json`)
  if (cachable && lazy.bindings.fs.existsSync(cacheName)) {
    const file = lazy.bindings.fs.readFileSync(cacheName)
    const ret = JSON.parse(file)
    lazy.debug('cache hit')
    lazy.debugDir(ret)
    return ret
  } else {
    const env = resolveDevEnvironmentInner(setup)
    cachable && lazy.bindings.fs.writeFileSync(cacheName, JSON.stringify(env))
    lazy.debug('actual resolution')
    lazy.debugDir(env)
    return env
  }
}

module.exports = {
  try_powershell_path: `"${__dirname}\\tools\\try_powershell.cmd"`,
  compile_run_path: `"${__dirname}\\tools\\compile-run.cmd"`,
  try_registry_path: `"${__dirname}\\tools\\try_registry.cmd"`,
  try_registry_sdk_path: `"${__dirname}\\tools\\try_registry_sdk.cmd"`,
  try_registry_msbuild_path: `"${__dirname}\\tools\\try_registry_msbuild.cmd"`,
  check_VS2017_COM_path: `"${__dirname}\\tools\\check_VS2017_COM.cmd"`,
  setBindings,
  getVS2017Setup,
  getVS2017Path: (_, arch) => findVcVarsFile(arch),
  locateMsbuild,
  locateMSBuild2017,
  getMSVSVersion: (version) => getMSVSSetup(version).version,
  getOSBits,
  findOldVcVarsFile: (_, arch) => findVcVarsFile(arch),
  resolveDevEnvironment,
  _forTesting: {
    tryVS2017Powershell,
    tryVS2017CSC,
    tryVS2017Registry,
    tryRegistrySDK,
    tryRegistryMSBuild,
    getWithFullCmd,
    execAndParse
  }
}
