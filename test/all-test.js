/* global describe, it, before, after */
'use strict'

const fs = require('fs')
const assert = require('assert')
const execSync = require('child_process').execSync
const getter = require('../')

const prods = new Set(['BuildTools', 'Enterprise', 'Professional', 'Community'])

describe('Try cmd tools', () => {

  it('Powershell', () => {
    const ret = execSync(getter.try_powershell_path).toString()
    const setup = JSON.parse(ret)[0]
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

  it('Registry', () => {
    const ret = execSync(getter.try_registry_path).toString()
    const setup = JSON.parse(ret).find(s => s.RegistryVersion === '15.0')
    assert(setup.RegistryVersion)
    assert(setup.InstallationPath)
    assert(setup.CmdPath)
  })

})

describe('Try cmd tools in a weird path', () => {

  const weirdDir = `"${__dirname}\\.tmp\\ t o l s !\\ oh$# boy lady gaga\\"`;
  const {try_powershell_path, compile_run_path, try_registry_path} = getter
  before(() => {
    execSync(`"cmd.exe" /s /c xcopy /s /q ${__dirname + '\\..\\tools\\*.*'} ${weirdDir}`)
  })

  it('Powershell', () => {
    getter.try_powershell_path = weirdDir + getter.try_powershell_path.split('\\').pop()
    const setup = getter._forTesting.tryVS7_powershell()
    assert(setup.Product)
    assert(setup.InstallationPath)
    assert(setup.Version)
    assert(setup.SDKFull)
    assert(setup.SDK)
    assert(setup.CmdPath)
    assert(fs.existsSync(setup.CmdPath))
  })

  it('Compile and run', () => {
    getter.try_powershell_path = weirdDir + getter.compile_run_path.split('\\').pop()
    const setup = getter._forTesting.tryVS7_CSC()
    assert(setup.Product)
    assert(setup.InstallationPath)
    assert(setup.Version)
    assert(setup.SDKFull)
    assert(setup.SDK)
    assert(setup.CmdPath)
    assert(fs.existsSync(setup.CmdPath))
  })

  it('Registry', function () {
    this.timeout(10000)
    getter.try_powershell_path = weirdDir + getter.try_registry_path.split('\\').pop()
    const setup = getter._forTesting.tryVS7_registry()
    if (!setup) {
      console.log("registry method failed")
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
    execSync(`"cmd.exe" /s /c rmdir /s /q ${weirdDir}`)
    Object.assign(getter, {try_powershell_path, compile_run_path, try_registry_path})
    assert(!getter.try_powershell_path.includes(" t o l s !"))
  })
})

function extractFile (str) {
  return str.replace(/(\.bat)("?\s.*|$)/, '$1').replace('"', '')
}

describe('Try node wrapper', () => {

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
    assert(prods.has(parts.pop()))
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

  it('getMSVSVersion', () => {
    const version = getter.getMSVSVersion()
    assert.equal(version, process.env['GYP_MSVS_VERSION'] || '2017')
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
    const env = getter.resolveDevEnvironment('x64')
    assert(env, 'didn\'t get ENVIRONMENT :(')
    const COMNTOOLS = Object.keys(env).find(k => k.includes('VCINSTALLDIR'))
    assert(COMNTOOLS, 'didn\'t get VCINSTALLDIR :(')
    if (env['VisualStudioVersion'] === '15.0') {
      assert.equal(env['VSCMD_ARG_TGT_ARCH'], 'x64')
      assert(env['__VSCMD_PREINIT_PATH'], 'Last env var should be __VSCMD_PREINIT_PATH')
    }
  })

  it('resolve for x86', () => {
    const env = getter.resolveDevEnvironment('ia32')
    assert(env, 'didn\'t get ENVIRONMENT :(')
    const COMNTOOLS = Object.keys(env).find(k => k.includes('VCINSTALLDIR'))
    assert(COMNTOOLS, 'didn\'t get VCINSTALLDIR :(')
    if (env['VisualStudioVersion'] === '15.0') {
      assert.equal(env['VSCMD_ARG_TGT_ARCH'], 'x86')
      assert(env['__VSCMD_PREINIT_PATH'], 'Last env var should be __VSCMD_PREINIT_PATH')
    }
  })
})
