// Copyright 2017 - Refael Ackermann
// Distributed under MIT style license
// See accompanying file LICENSE at https://github.com/node4good/windows-autoconf

'use strict'
/**
 * @namespace vsSetup
 * @property {String} Product
 * @property {String} Version
 * @property {Boolean} IsComplete
 * @property {Boolean} IsLaunchable
 * @property {String} CmdPath
 * @property {Object} FullCmd
 * @property {Object} MSBuild
 * @property {Object} MSBuildToolsPath
 * @property {Object} MSBuildPath
 * @property {Object} VCTools
 * @property {Boolean} SDK8
 * @property {Object} SDK
 * @property {Array} Packages
 * @property {?String} RegistryVersion
 */

const bindings = {
  _patched: false,
  _bindings: null,
  _checkForDebug (env) { return (env || '').split(',').includes('autoconf') },
  _createDefaultBindings () {
    const _bindings = {
      fs: require('fs'),
      path: require('path'),
      log: console.log.bind(console),
      error: console.error.bind(console),
      execSync: require('child_process').execSync,
      process: process,
      isDebug: this._checkForDebug(this.process.env['DEBUG'])
    }
    return _bindings
  },
  set inner (_bindings) {
    this._bindings = _bindings
    this.__proto__ = _bindings
    if (this.isDebug && !this._patched) {
      this._patched = true
      _bindings.util = require('util')
      _bindings._execSync = _bindings.execSync
      _bindings.execSync = (cmd, ...args) => {
        console.log('============== execSync ==============')
        console.log('execSync cmd: %s', cmd)
        console.log('execSync args: %j', args)
        const ret = _bindings._execSync(cmd, ...args)
        console.log('=== output: ===\n')
        console.log(ret)
        console.log('============== execSync ==============')
        return ret
      }
    }
  },
  get inner () {
    if (!this._bindings) {
      this.inner = this._createDefaultBindings()
    }
    return this._bindings
  },
  debug (...args) { if (this.isDebug) this.log(...args) },
  debugDir (arg) {
    if (this.isDebug) {
      console.log('=============\n%s\n=============', this.util.inspect(arg, {colors: true}))
    }
  }
}

function setBindings (_bindings) {
  bindings.inner = _bindings
}

function execAndParse (cmd) {
  const lines = bindings.inner.execSync(cmd).toString().split(/\r?\n/g)
  const ret = lines.filter(l => l.slice(0, 4) === '    ').join('')
  const log = lines.filter(l => l.slice(0, 4) !== '    ').join('')
  const err = ['ERROR', log, ret]
  if (ret.includes('ERROR')) return err
  try {
    const setup = JSON.parse(ret)
    setup.log = log
    return setup
  } catch (e) {
    bindings.debug('====== ret =======')
    bindings.debug(ret)
    bindings.debug('====== log =======')
    bindings.debug(log)
    bindings.debug('==================')
    return err.concat([e])
  }
}

function checkSetup (setups) {
  if (setups && setups[0] === 'No COM') return 'No COM'
  setups.sort((a, b) => a.Version.localeCompare(b.Version)).reverse()
  const setup = setups.find(s => s.MSBuild && s.VCTools && (s.SDK || s.SDK8))
  if (setups.length && !setup) return 'No C++'
  return setup
}

function tryVS2017Powershell () {
  try {
    const vsSetups = execAndParse(module.exports.try_powershell_path)
    return checkSetup(vsSetups)
  } catch (e) {
    bindings.log('Couldn\'t find VS2017 with powershell')
  }
}

function tryVS2017CSC () {
  try {
    const vsSetups = execAndParse(module.exports.compile_run_path)
    return checkSetup(vsSetups)
  } catch (e) {
    bindings.log('Couldn\'t find VS2017 with a compiled exe')
  }
}

function tryVS2017Registry () {
  let vsSetupsRaw
  try {
    vsSetupsRaw = execAndParse(module.exports.try_registry_path)
    if (vsSetupsRaw[0] === 'ERROR') {
      bindings.debug('Couldn\'t execute 2017 registry finder')
      return
    }
  } catch (e) {
    bindings.debug('Couldn\'t execute 2017 registry finder: ' + e.message)
  }

  const vsSetup = vsSetupsRaw.find(i => Number(i.RegistryVersion) === 15.0)
  if (!vsSetup) {
    bindings.debug('Couldn\'t find ver 15.0 in registry')
    return
  }
  bindings.debugDir(vsSetup)
  if (!bindings.inner.fs.existsSync(vsSetup.CmdPath)) {
    bindings.debug(`${vsSetup.CmdPath} doesn't exist`)
    return
  }

  let env
  try {
    env = resolveDevEnvironmentInner(`"${vsSetup.CmdPath}" -no_logo`)
    bindings.debugDir(env)
  } catch (e) {
    bindings.debug('Couldn\'t execute 2017 VsDevCmd.bat: ' + e.message)
  }
  vsSetup.SDKFull = env['WindowsSDKVersion'].split('=').pop().replace('\\', '')
  vsSetup.Version = Boolean(env['VCToolsInstallDir']) && env['VCToolsInstallDir'].replace(/.*?\\([\d.]{5,})\\.*/, '$1')
  vsSetup.SDK = vsSetup.SDKFull.replace(/\d+$/, '0')
  vsSetup.Product = vsSetup.InstallationPath.split('\\').slice(-2, -1)[0]
  return vsSetup
}

function tryRegistrySDK () {
  try {
    const sdkSetups = execAndParse(module.exports.try_registry_sdk_path)
    bindings.debug(JSON.stringify(sdkSetups, null, '  '))
    const vers = sdkSetups
      .filter(s => s['InstallationFolder'])
      .map(s => {
        const parts = s['ProductVersion'].split('.')
        const ver = Number(parts.shift() + '.' + parts.join(''))
        return {ver, ProductVersion: s['ProductVersion']}
      })
      .sort((a, b) => a[0] - b[0])
      .reverse()
    bindings.debug(JSON.stringify(vers, null, '  '))
    const sdkSetup = sdkSetups.find(s => s['ProductVersion'] === vers[0].ProductVersion)
    return sdkSetup
  } catch (e) {
    bindings.log('Couldn\'t find any SDK in registry')
  }
}

function tryRegistryMSBuild (ver) {
  try {
    const msbSetups = execAndParse(module.exports.try_registry_msbuild_path)
    const vers = msbSetups.map(s => s['ver'])
    ver = Number(ver) || Math.max.apply(null, vers)
    const msbSetup = msbSetups.find(s => s['ver'] === ver)
    return msbSetup
  } catch (e) {
    bindings.log('Couldn\'t find any SDK in registry')
  }
}

function getVS2017Setup () {
  if ('cache2017' in getVS2017Setup) return getVS2017Setup.cache2017
  const vsSetup = tryVS2017Powershell() || tryVS2017CSC() || tryVS2017Registry()
  getVS2017Setup.cache2017 = vsSetup
  return vsSetup
}

function locateMsbuild (ver) {
  ver = ver || 'auto'
  const msbSetup = ((ver in {2017: 1, auto: 1}) && locateMSBuild2017()) || tryRegistryMSBuild(ver)
  if (!msbSetup) {
    bindings.log('Can\'t find "msbuild.exe"')
    return
  }
  return msbSetup.MSBuildPath
}

function locateMSBuild2017 () {
  const vsSetup = getVS2017Setup()
  if (!vsSetup || typeof vsSetup === 'string') return
  const ver = '15.0'
  return {ver, MSBuildToolsPath: vsSetup.MSBuildToolsPath, MSBuildPath: vsSetup.MSBuildPath}
}

function getMSVSSetup (version) {
  if ('cacheSetup' in getMSVSSetup) return getMSVSSetup.cacheSetup
  const env = bindings.process.env
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
    setup.InstallationPath = bindings.path.join(setup.CommonTools, '..', '..')
  }
  getMSVSSetup.cacheSetup = setup
  return setup
}

function getOSBits () {
  const env = bindings.process.env

  // PROCESSOR_ARCHITEW6432 - is a system arch
  // PROCESSOR_ARCHITECTURE - is a session arch
  const hostArch = env['PROCESSOR_ARCHITEW6432'] || env['PROCESSOR_ARCHITECTURE']
  if (hostArch === 'AMD64') { return 64 } else { return 32 }
}

function getWithFullCmd (argTargetArch) {
  let setup = getMSVSSetup()
  if (setup.version === 'auto') throw new Error('No Visual Studio found. Try to run from an MSVS console')

  if (argTargetArch === 'x86') argTargetArch = 'ia32'
  setup.arg_target_arch = argTargetArch
  setup.hostBits = getOSBits()
  setup.hostArch = setup.hostBits === 64 ? 'amd64' : 'x86'
  setup.targetArch = argTargetArch === 'x64' ? 'amd64' : argTargetArch === 'ia32' ? 'x86' : argTargetArch

  if (setup.version === '2017') {
    setup.FullCmd = `"${setup.CmdPath}" -arch=${setup.targetArch} -host_arch=${setup.hostArch} -no_logo`
  } else {
    // NOTE: Largely inspired by `GYP`::MSVSVersion.py
    let cmdPathParts
    let arg
    setup.effectiveBits = setup.InstallationPath.includes('(x86)') ? 32 : setup.hostBits
    if (argTargetArch === 'ia32') {
      if (setup.effectiveBits === 64) {
        cmdPathParts = ['VC', 'vcvarsall.bat']
        arg = 'amd64_x86'
      } else {
        cmdPathParts = ['Common7', 'Tools', 'vsvars32.bat']
        arg = ''
      }
    } else if (argTargetArch === 'x64') {
      cmdPathParts = ['VC', 'vcvarsall.bat']
      arg = setup.effectiveBits === 64 ? 'amd64' : 'x86_amd64'
    } else {
      throw new Error(`Arch: '${argTargetArch}' is not supported`)
    }
    setup.CmdPath = bindings.path.join(setup.InstallationPath, ...cmdPathParts)
    setup.FullCmd = `"${setup.CmdPath}" ${arg}`
  }
  return setup
}

function findVcVarsFile (targetArch) {
  let setup = getWithFullCmd(targetArch)
  if (setup.version === 'auto') throw new Error('No Visual Studio found. Try to run from an MSVS console')
  return setup.FullCmd
}

function resolveDevEnvironmentInner (fullCmd) {
  const lines = bindings.execSync(`${fullCmd} & set`, {env: {}}).toString().trim().split(/\r\n/g)
  const hasFail = lines.slice(0, 2).some(l => l.includes('missing') || l.includes('not be installed'))
  if (hasFail) {
    const lastArg = fullCmd.split('-').pop()
    throw new Error(`Visual studio tools for C++ could not be setup for ${lastArg}\nby ${fullCmd}`)
  }
  const env = lines.reduce((s, l) => {
    const kv = l.split('=')
    if (kv.length === 2) s[kv[0]] = kv[1]
    return s
  }, {})

  return env
}

function setupCache (cacheDir) {
  try {
    const ex = bindings.fs.existsSync(cacheDir)
    if (!ex) bindings.fs.mkdirSync(cacheDir)
    const testFile = bindings.path.join(cacheDir, '.check')
    bindings.fs.writeFileSync(testFile, '')
    return true
  } catch (_) {
    return false
  }
}

function resolveDevEnvironment (targetArch, noCache) {
  const setup = getWithFullCmd(targetArch)
  bindings.debugDir(setup)
  const cacheKey = setup.FullCmd.replace(/\s|\\|\/|:|=|"/g, '')
  const env = bindings.process.env
  const cacheDir = bindings.path.join(env.HOME || env.USERPROFILE, '.autoconf')
  const cachable = setupCache(cacheDir)
  const cacheName = bindings.path.join(cacheDir, `_${cacheKey}${setup.Version}.json`)
  if (!noCache && cachable && bindings.fs.existsSync(cacheName)) {
    const file = bindings.fs.readFileSync(cacheName)
    const ret = JSON.parse(file)
    bindings.debug('cache hit')
    bindings.debugDir(ret)
    return ret
  } else {
    const env = resolveDevEnvironmentInner(setup.FullCmd, targetArch)
    cachable && bindings.fs.writeFileSync(cacheName, JSON.stringify(env))
    bindings.debug('actual resolution')
    bindings.debugDir(env)
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
    get bindings () {
      if (!bindings._bindings) bindings.inner
      return bindings
    },
    tryVS2017Powershell,
    tryVS2017CSC,
    tryVS2017Registry,
    tryRegistrySDK,
    tryRegistryMSBuild,
    getWithFullCmd,
    execAndParse
  }
}
