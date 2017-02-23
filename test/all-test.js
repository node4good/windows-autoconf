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

describe('Try cmd tools', () => {
  describe('Try COM', () => {
    before(function () {
      const ret = execSync(getter.try_powershell_path).toString()
      const setup = JSON.parse(ret)[0]
      if (setup === 'No COM') {
        this.skip()
      }
    })

    it('Powershell', () => {
      const ret = execSync(getter.try_powershell_path).toString()
      const setup = JSON.parse(ret)[0]
      if (setup === 'No COM') return
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })

    it('Powershell -Version 2', () => {
      const csfile = getter.try_powershell_path.replace(/\\[^\\]+$/, '\\Get-VS7.cs').replace('"', '')
      const cmd = `"powershell.exe" -Version 2 -ExecutionPolicy Unrestricted -Command "&{ Add-Type -Path '${csfile}'; [VisualStudioConfiguration.Main]::Query()}"`
      const ret = execSync(cmd).toString()
      const setup = JSON.parse(ret)[0]
      if (setup === 'No COM') return
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })

    it('Compile and run', () => {
      const ret = execSync(getter.compile_run_path).toString()
      const setup = JSON.parse(ret)[0]
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })
  })

  it('Registry', () => {
    const ret = execSync(getter.try_registry_path).toString()
    const setup = JSON.parse(ret).find(s => s.RegistryVersion === '15.0')
    if (!setup) {
      console.log('registry method failed')
      return
    }
    assert(setup.RegistryVersion)
    assert(setup.InstallationPath)
    assert(setup.CmdPath)
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
    before(function () {
      const ret = execSync(getter.try_powershell_path).toString()
      const setup = JSON.parse(ret)[0]
      if (setup === 'No COM') {
        this.skip()
      }
    })

    it('Powershell', () => {
      const setup = getter._forTesting.tryVS7Powershell()
      if (setup === 'No COM') return

      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDKFull)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })

    it('Compile and run', () => {
      const setup = getter._forTesting.tryVS7CSC()
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDKFull)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })
  })

  it('Registry', function () {
    this.timeout(10000)
    const setup = getter._forTesting.tryVS7Registry()
    if (!setup) {
      console.log('registry method failed')
      return
    }
    assert(setup.RegistryVersion)
    assert(setup.InstallationPath)
    assert(setup.CmdPath)
    assert(setup.Product)
    assert(setup.Version)
    assert(setup.SDKFull)
    assert(setup.SDK)
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

    it('locateMsbuild', () => {
      const path = getter.locateMsbuild()
      const parts = path.split('\\')
      assert(parts.length >= 4)
      assert(path.match(/MSBuild\.exe$/i))
      assert(fs.existsSync(path))
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
