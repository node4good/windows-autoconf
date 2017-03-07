/* eslint-disable no-path-concat */
'use strict'
/* global describe, it, before, after */
/** @namespace this
 *  @property {function} skip
 */

const fs = require('fs')
const Path = require('path')
const assert = require('assert')
const execSync = require('child_process').execSync
const getter = require('../')

const prods = new Set(['BuildTools', 'Enterprise', 'Professional', 'Community'])
function checkCom () {
  let ret
  try {
    ret = execSync(getter.check_VS2017_COM_path).toString()
  } catch (e) {
    console.error(e)
    assert.equal(e.status, 1)
    ret = e.output[1].toString().trim()
    assert.equal(ret, '"No COM"')
  }
  const setup = JSON.parse(ret)
  if (setup === 'No COM') {
    this.skip()
  } else {
    assert.equal(setup, 'COM Ok')
  }
}

describe('Try cmd tools', () => {
  describe('Try COM', () => {
    before(checkCom)

    it('Powershell', () => {
      const ret = getter._forTesting.execAndParse(getter.try_powershell_path)
      const setup = ret[0]
      if (setup === 'No COM') return
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })

    it('Powershell -Version 2', () => {
      const csfile = getter.try_powershell_path.replace(/\\[^\\]+$/, '\\GetVS2017Configuration.cs').replace('"', '')
      const cmd = `"powershell.exe" -Version 2 -NoProfile -ExecutionPolicy Unrestricted -Command "& { Add-Type -Path '${csfile}'; [VisualStudioConfiguration.Main]::Query()}"`
      const ret = getter._forTesting.execAndParse(cmd)
      const setup = ret[0]
      if (setup === 'No COM') return
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })

    it('Compile and run', () => {
      const ret = getter._forTesting.execAndParse(getter.compile_run_path)
      const setup = ret[0]
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })
  })

  it('Registry', () => {
    const ret = getter._forTesting.execAndParse(getter.try_registry_path)
    const setup = ret.find(s => s.RegistryVersion === '15.0')
    if (!setup) {
      console.log('registry method failed')
      return
    }
    assert(setup.RegistryVersion)
    assert(setup.InstallationPath)
    assert(setup.CmdPath)
  })

  it('SDK Registry', () => {
    const ret = getter._forTesting.execAndParse(getter.try_registry_sdk_path)
    const setup = ret.find(s => s['ProductName'].includes('Windows SDK for Windows 10'))
    if (!setup) {
      console.log('registry method failed')
      return
    }
    assert(setup['InstallationFolder'])
    assert(setup['ProductVersion'])
  })
})

describe('Try cmd tools in a weird path', () => {
  const weirdDir = `"${__dirname}\\.tmp\\ t o l s !\\ oh$# boy lady gaga\\`
  const {try_powershell_path, compile_run_path, try_registry_path} = getter
  before(() => {
    try {
      execSync(`"cmd.exe" /s /c mkdir ${weirdDir}`)
    } catch (_) {}
    const ret = execSync(`"cmd.exe" /s /c "xcopy /y /r /e /q "${__dirname + '\\..\\tools\\*.*'}" ${weirdDir}" "`).toString()
    assert(ret.includes('File(s) copied'))
    getter.try_powershell_path = Path.join(weirdDir, Path.basename(getter.try_powershell_path))
    getter.compile_run_path = Path.join(weirdDir, Path.basename(getter.compile_run_path))
    getter.try_registry_path = Path.join(weirdDir, Path.basename(getter.try_registry_path))
  })

  describe('Try COM', () => {
    before(checkCom)

    it('Powershell', () => {
      const setup = getter._forTesting.tryVS2017Powershell()
      if (setup === 'No COM') return

      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })

    it('Compile and run', () => {
      const setup = getter._forTesting.tryVS2017CSC()
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })
  })

  it('Registry', function () {
    this.timeout(10000)
    const setup = getter._forTesting.tryVS2017Registry()
    if (!setup) {
      console.log('registry method failed')
      return this.skip()
    }
    assert(setup.RegistryVersion)
    assert(setup.InstallationPath)
    assert(setup.CmdPath)
    assert(setup.Product)
    assert(setup.Version)
    assert(setup.SDKFull)
    assert(setup.SDK)
  })

  it('Registry SDK', function () {
    this.timeout(10000)
    const setup = getter._forTesting.tryRegistrySDK()
    if (!setup) {
      console.log('registry method failed')
      return
    }
    assert(setup['InstallationFolder'])
    assert(setup['ProductVersion'])
  })

  it('Registry MSBuild', function () {
    this.timeout(10000)
    const msbSetup = getter._forTesting.tryRegistryMSBuild()
    if (!msbSetup) {
      console.log('registry method failed')
      return this.skip()
    }
    assert(msbSetup.ver)
    assert(msbSetup.MSBuildToolsPath)
    assert(fs.existsSync(msbSetup.MSBuildToolsPath))
    assert(msbSetup.MSBuildPath)
    const parts = msbSetup.MSBuildPath.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop() === 'MSBuild.exe')
    assert(fs.existsSync(msbSetup.MSBuildPath))
  })

  after(() => {
    const pathParts = weirdDir.split('\\')
    const i = pathParts.lastIndexOf('.tmp')
    const baseParts = pathParts.slice(0, i + 2)
    const weirdPart = baseParts.slice(-1)[0]
    const basePath = baseParts.join('\\') + '"'
    Object.assign(getter, {try_powershell_path, compile_run_path, try_registry_path})
    assert(!getter.try_powershell_path.includes(weirdPart))
    execSync(`"cmd.exe" /s /c rmdir /s /q ${basePath}`)
  })
})

function extractFile (str) {
  return str.replace(/(\.bat)("?\s.*|$)/, '$1').replace('"', '')
}

describe('Try node wrapper', function () {
  this.timeout(10000)

  it('getMSVSVersion', () => {
    const version = getter.getMSVSVersion()
    assert.equal(version, process.env['GYP_MSVS_VERSION'] || '2017')
  })

  describe('2017 only', function () {
    before(function () {
      const version = getter.getMSVSVersion()
      if (version !== '2017') this.skip()
    })

    it('getVS2017Path x64', () => {
      const ret = getter.getVS2017Path(null, 'x64')
      const parts = ret.split('\\')
      assert(parts.length >= 4)
      assert(parts.includes('Common7') || parts.includes('VC'))
      assert(ret.match(/\.bat/i))
      const path = extractFile(ret)
      assert(fs.existsSync(path))
    })

    it('getVS2017Path ia32', () => {
      const ret = getter.getVS2017Path(null, 'ia32')
      const parts = ret.split('\\')
      assert(parts.length >= 4)
      assert(parts.includes('Common7') || parts.includes('VC'))
      assert(ret.match(/\.bat/i))
      const path = extractFile(ret)
      assert(fs.existsSync(path))
    })

    it('getVS2017Setup', () => {
      const vsSetup = getter.getVS2017Setup()
      assert(vsSetup.InstallationPath)
      const parts = vsSetup.InstallationPath.split('\\')
      assert(parts.length >= 4)
      const prod = Path.basename(vsSetup.InstallationPath)
      assert(prods.has(prod), `${prod} not in ${prods}`)
      assert(vsSetup.CmdPath)
      assert(vsSetup.CmdPath.match(/\.bat$/i))
      assert(fs.existsSync(vsSetup.InstallationPath))
      assert(fs.existsSync(vsSetup.CmdPath))
    })

    it('locateMSBuild2017', () => {
      const msbSetup = getter.locateMSBuild2017()
      assert.equal(msbSetup.ver, '15.0')
      assert(msbSetup.MSBuildToolsPath)
      assert(fs.existsSync(msbSetup.MSBuildToolsPath))
      assert(msbSetup.MSBuildPath)
      const parts = msbSetup.MSBuildPath.split('\\')
      assert(parts.length >= 4)
      assert(parts.pop() === 'MSBuild.exe')
      assert(fs.existsSync(msbSetup.MSBuildPath))
    })
  })

  it('getOSBits', () => {
    const bits = getter.getOSBits()
    assert.equal(bits, 64)
  })

  it('findOldVcVarsFile x64', () => {
    const cmd = getter.findOldVcVarsFile(null, 'x64')
    const path = extractFile(cmd)
    const parts = path.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop().match(/vs|vars/i))
    assert(fs.existsSync(path))
  })

  it('findOldVcVarsFile ia32', () => {
    const cmd = getter.findOldVcVarsFile(null, 'ia32')
    const path = extractFile(cmd)
    const parts = path.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop().match(/vs|vars/i))
    assert(fs.existsSync(path))
  })

  it('getWithFullCmd ia32', () => {
    const setup = getter._forTesting.getWithFullCmd('ia32')
    const cmd = setup.CmdPath
    const parts = cmd.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop().match(/vs|vars/i))
    assert(fs.existsSync(cmd))
  })

  it('getWithFullCmd x64', () => {
    const setup = getter._forTesting.getWithFullCmd('x64')
    const cmd = setup.CmdPath
    const parts = cmd.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop().match(/vs|vars/i))
    assert(fs.existsSync(cmd))
  })

  it('locateMsbuild', () => {
    const msbPath = getter.locateMsbuild()
    const parts = msbPath.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop() === 'MSBuild.exe')
    assert(fs.existsSync(msbPath))
  })

  it('locateMsbuild(auto)', () => {
    const msbPath = getter.locateMsbuild('auto')
    const parts = msbPath.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop() === 'MSBuild.exe')
    assert(fs.existsSync(msbPath))
  })

  it('locateMsbuild(2017)', function () {
    const msbPath = getter.locateMsbuild(2017)
    if (!msbPath) this.skip()
    const parts = msbPath.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop() === 'MSBuild.exe')
    assert(fs.existsSync(msbPath))
  })

  it('locateMsbuild(4)', () => {
    const msbPath = getter.locateMsbuild(4)
    const parts = msbPath.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop() === 'MSBuild.exe')
    assert(msbPath.includes('\\v4.'))
    assert(fs.existsSync(msbPath))
  })
})

describe('genEnvironment', function () {
  this.timeout(20000)

  it('resolve for x64', () => {
    let env
    try {
      env = getter.resolveDevEnvironment('x64')
    } catch (e) {
      if (!e.message.includes('not installed for')) throw e
      console.log(e.message)
      return
    }
    assert(env, 'didn\'t get ENVIRONMENT :(')
    const COMNTOOLS = Object.keys(env).find(k => k.includes('VCINSTALLDIR'))
    assert(COMNTOOLS, 'didn\'t get VCINSTALLDIR :(')
    if (env['VisualStudioVersion'] === '15.0') {
      assert.equal(env['VSCMD_ARG_TGT_ARCH'], 'x64')
      assert(env['__VSCMD_PREINIT_PATH'], 'Last env var should be __VSCMD_PREINIT_PATH')
    }
  })

  it('resolve for x86', () => {
    let env
    try {
      env = getter.resolveDevEnvironment('ia32')
    } catch (e) {
      if (!e.message.includes('not installed for')) throw e
      console.log(e.message)
      return
    }
    assert(env, 'didn\'t get ENVIRONMENT :(')
    if (env instanceof String) {
      console.log(env)
      return
    }
    const COMNTOOLS = Object.keys(env).find(k => k.includes('VCINSTALLDIR'))
    assert(COMNTOOLS, 'didn\'t get VCINSTALLDIR :(')
    if (env['VisualStudioVersion'] === '15.0') {
      assert.equal(env['VSCMD_ARG_TGT_ARCH'], 'x86')
      assert(env['__VSCMD_PREINIT_PATH'], 'Last env var should be __VSCMD_PREINIT_PATH')
    }
  })
})
