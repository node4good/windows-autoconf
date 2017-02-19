/* global describe, it */
'use strict'

const fs = require('fs')
const assert = require('assert')
const execSync = require('child_process').execSync
const getter = require('../')

describe('Try cmd tools', () => {

  it('Powershell', () => {
    const ret = execSync(getter.try_powershell_path).toString()
    assert(ret.includes('InstallationPath'))
    assert(ret.includes('SDK'))
    assert(ret.includes('CmdPath'))
    assert(ret.includes('\\Common7\\'))
    assert(ret.match(/VsDevCmd\.bat\s/i))
  })

  it('Compile and run', () => {
    const ret = execSync(getter.compile_run_path).toString()
    assert(ret.includes('InstallationPath'))
    assert(ret.includes('SDK'))
    assert(ret.includes('CmdPath'))
    assert(ret.includes('\\Common7\\'))
    assert(ret.match(/VsDevCmd\.bat\s/i))
  })

  it('Registry', () => {
    const ret = execSync(getter.try_registry_path).toString()
    assert(ret.includes('InstallationPath'))
    assert(ret.includes('CmdPath'))
    assert(ret.includes('\\Common7\\'))
    assert(ret.match(/VsDevCmd\.bat\s/i))
  })

})

describe('Try node wrapper', () => {

  it('getVS2017Path', () => {
    const ret = getter.getVS2017Path(64, 'x64')
    const parts = ret.split('\\')
    assert(parts.length >= 4)
    assert(parts.includes('Common7'))
    assert(ret.match(/VsDevCmd\.bat\s/i))
    const cmdPath = ret.split(' -arch')[0]
    assert(fs.existsSync(cmdPath))
  })

  it('getVS2017Setup', () => {
    const vsSetup = getter.getVS2017Setup()
    assert(vsSetup.InstallationPath)
    const parts = vsSetup.InstallationPath.split('\\')
    assert(parts.length >= 4)
    assert(parts.includes('BuildTools'))
    assert(vsSetup.CmdPath)
    assert(vsSetup.CmdPath.match(/VsDevCmd\.bat$/i))
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
    assert.equal(version, '2017')
  })

  it('getOSBits', () => {
    const bits = getter.getOSBits()
    assert.equal(bits, 64)
  })

  it('findOldVcVarsFile', () => {
    const cmd = getter.findOldVcVarsFile()
    const path = cmd.replace(/(\.\w\w\w)(\b.*|$)/, '$1')
    const parts = path.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop().match(/vs/i))
    assert(fs.existsSync(path))
  })

})

describe('genEnvironment', function () {
  this.timeout(20000)
  it('resolve for x64', () => {
    const env = getter.resolveDevEnvironment('x64')
    assert(env, 'didn\'t get ENVIRONMENT :(')
    const COMNTOOLS = Object.keys(env).find(k => k.includes('COMNTOOLS'))
    assert(COMNTOOLS, 'didn\'t get COMNTOOLS :(')
    if (COMNTOOLS === 'VS150COMNTOOLS') {
      assert.equal(env['VSCMD_ARG_TGT_ARCH'], 'x64')
      assert.equal(env['VisualStudioVersion'], '15.0')
      assert(env['__VSCMD_PREINIT_PATH'],
        'Last env var should be __VSCMD_PREINIT_PATH')
    }
  })

  it('resolve for x86', () => {
    const env = getter.resolveDevEnvironment('x86')
    assert(env, 'didn\'t get ENVIRONMENT :(')
    const COMNTOOLS = Object.keys(env).find(k => k.includes('COMNTOOLS'))
    assert(COMNTOOLS, 'didn\'t get COMNTOOLS :(')
    if (COMNTOOLS === 'VS150COMNTOOLS') {
      assert.equal(env['VSCMD_ARG_TGT_ARCH'], 'x86')
      assert.equal(env['VisualStudioVersion'], '15.0')
      assert(env['__VSCMD_PREINIT_PATH'],
        'Last env var should be __VSCMD_PREINIT_PATH')
    }
  })
})
