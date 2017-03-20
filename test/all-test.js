// Copyright 2017 - Refael Ackermann
// Distributed under MIT style license
// See accompanying file LICENSE at https://github.com/node4good/windows-autoconf

'use strict'
/* eslint-disable no-path-concat */
/* global describe, it, before, after */
/** @namespace this
 *  @property {function} skip
 */

const fs = require('fs')
const Path = require('path')
const assert = require('assert')
const getter = require('../')
const execSync = getter._forTesting.bindings.execSync

const prods = new Set(['BuildTools', 'Enterprise', 'Professional', 'Community'])
function checkCom () {
  try {
    execSync(getter.check_VS2017_COM_path).toString()
  } catch (e) {
    assert.equal(e.status, 1)
    this.skip()
  }
}

describe('Try cmd tools', () => {
  describe('Try COM', function () {
    before(checkCom)

    it('Powershell', () => {
      const ret = getter._forTesting.execAndParse(getter.try_powershell_path)
      const setup = ret[0]
      if (setup === 'No COM') return
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(fs.existsSync(setup.InstallationPath))
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
      if (setup.MSBuild) {
        assert(setup.MSBuildToolsPath)
        assert(setup.MSBuildPath)
        assert(fs.existsSync(setup.MSBuildPath))
      }
    })

    it('Powershell -Version 2', function () {
      const csFiles = getter.try_powershell_path.replace(/\\[^\\]+$/, '\\..\\tools*\\*.cs').replace('"', '')
      const cmd = `"powershell.exe" -Version 2 -NoProfile -ExecutionPolicy Unrestricted -Command "& { Add-Type (Out-String -InputObject (Get-Content '${csFiles}')); [VisualStudioConfiguration.Program]::Query() }`
      let ret
      try {
        ret = getter._forTesting.execAndParse(cmd)
      } catch (e) {
        if (e.output[2].toString('utf16le').includes('not installed')) {
          this.skip()
        }
      }
      const setup = ret[0]
      if (setup === 'No COM') return
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(fs.existsSync(setup.InstallationPath))
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
      if (setup.MSBuild) {
        assert(setup.MSBuildToolsPath)
        assert(setup.MSBuildPath)
        assert(fs.existsSync(setup.MSBuildPath))
      }
    })

    it('Compile and run', () => {
      const ret = getter._forTesting.execAndParse(getter.compile_run_path)
      const setup = ret[0]
      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(fs.existsSync(setup.InstallationPath))
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
      if (setup.MSBuild) {
        assert(setup.MSBuildToolsPath)
        assert(setup.MSBuildPath)
        assert(fs.existsSync(setup.MSBuildPath))
      }
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
    assert(fs.existsSync(setup.InstallationPath))
    assert(setup.CmdPath)
    assert(fs.existsSync(setup.CmdPath))
    if (setup.MSBuild) {
      assert(setup.MSBuildToolsPath)
      assert(setup.MSBuildPath)
      assert(fs.existsSync(setup.MSBuildPath))
    }
  })

  it('SDK Registry', () => {
    const ret = getter._forTesting.execAndParse(getter.try_registry_sdk_path)
    const setup = ret.find(s => s['ProductName'].includes('Windows SDK for Windows 10'))
    if (!setup) {
      console.log('registry method failed')
      return
    }
    assert(setup['ProductVersion'])
    assert(setup['InstallationFolder'])
  })
})

describe('Try cmd tools in a weird path', () => {
  console.log(__dirname)
  const weirdDirBase = `"${__dirname}\\.tmp\\ t o l s !\\ oh$# boy lady gaga\\`
  const weirdDir = `${weirdDirBase}tools`
  const weirdDir2 = `${weirdDirBase}tools-core`
  const {try_powershell_path, compile_run_path, try_registry_path} = getter

  before(() => {
    try {
      execSync(`"cmd.exe" /s /c mkdir ${weirdDir}`)
      execSync(`"cmd.exe" /s /c mkdir ${weirdDir2}`)
    } catch (_) {}

    const ret = execSync(`"cmd.exe" /s /c "xcopy /y /r /e /q "${__dirname + '\\..\\tools\\*.*'}" ${weirdDir}" "`).toString()
    assert(ret.includes('File(s) copied'))
    const ret2 = execSync(`"cmd.exe" /s /c "xcopy /y /r /e /q "${__dirname + '\\..\\tools-core\\*.*'}" ${weirdDir2}" "`).toString()
    assert(ret2.includes('File(s) copied'))
    getter.try_powershell_path = Path.join(weirdDir, Path.basename(getter.try_powershell_path))
    getter.compile_run_path = Path.join(weirdDir, Path.basename(getter.compile_run_path))
    getter.try_registry_path = Path.join(weirdDir, Path.basename(getter.try_registry_path))
  })

  describe('Try COM', () => {
    before(checkCom)

    it('Powershell', function () {
      const setup = getter._forTesting.tryVS2017Powershell()
      if (setup === 'No C++') return this.skip()

      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })

    it('Compile and run', function () {
      const setup = getter._forTesting.tryVS2017CSC()
      if (setup === 'No C++') return this.skip()

      assert(setup.Product)
      assert(setup.InstallationPath)
      assert(setup.Version)
      assert(setup.SDK)
      assert(setup.CmdPath)
      assert(fs.existsSync(setup.CmdPath))
    })
  })

  describe('Registry scripts', function () {
    before(function () {
      this.regSetup = getter._forTesting.tryVS2017Registry()
      if (!this.regSetup) return this.skip()
    })

    it('Find VS', function () {
      assert(this.regSetup.RegistryVersion)
      assert(this.regSetup.InstallationPath)
      assert(this.regSetup.CmdPath)
      assert(this.regSetup.Product)
      assert(this.regSetup.SDKFull)
      assert(this.regSetup.SDK)
    })

    it('Find VC 14.10', function () {
      if (typeof this.regSetup.Version !== 'string') return this.skip()
      assert(this.regSetup.Version.includes('14.10'), 'should have a 14.10 VC version')
    })

    it('Find SDK', function () {
      const setup = getter._forTesting.tryRegistrySDK()
      if (!setup) {
        console.log('registry method failed')
        return
      }
      assert(setup['InstallationFolder'])
      assert(setup['ProductVersion'])
    })

    it('Find MSBuild', function () {
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
  it('getMSVSVersion', function () {
    const version = getter.getMSVSVersion()
    if (version === 'auto') return this.skip()
    console.log(`env#${process.env['GYP_MSVS_VERSION']}#`)
    if ('GYP_MSVS_VERSION' in process.env && !(['auto', ''].includes(process.env['GYP_MSVS_VERSION']))) {
      assert.equal(version, process.env['GYP_MSVS_VERSION'])
    } else {
      assert(['2010', '2012', '2013', '2015', '2015', '2017'].includes(version))
    }
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
      assert(vsSetup.CmdPath)
      assert(fs.existsSync(vsSetup.CmdPath))
      if (vsSetup.MSBuild) {
        assert(vsSetup.MSBuildToolsPath)
        assert(vsSetup.MSBuildPath)
        assert(fs.existsSync(vsSetup.MSBuildPath))
      }
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

  it('findOldVcVarsFile x64', function () {
    let cmd
    try {
      cmd = getter.findOldVcVarsFile(null, 'x64')
    } catch (e) {
      assert(e.message.includes('No Visual Studio found'))
      this.skip()
    }
    const path = extractFile(cmd)
    const parts = path.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop().match(/vs|vars/i))
    assert(fs.existsSync(path))
  })

  it('findOldVcVarsFile ia32', function () {
    let cmd
    try {
      cmd = getter.findOldVcVarsFile(null, 'ia32')
    } catch (e) {
      assert(e.message.includes('No Visual Studio found'))
      this.skip()
    }
    const path = extractFile(cmd)
    const parts = path.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop().match(/vs|vars/i))
    assert(fs.existsSync(path))
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

  it('getWithFullCmd x64', function () {
    let setup
    try {
      setup = getter._forTesting.getWithFullCmd('x64')
    } catch (e) {
      assert(e.message.includes('No Visual Studio found'))
      this.skip()
    }

    const cmd = setup.CmdPath
    const parts = cmd.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop().match(/vs|vars/i))
    assert(fs.existsSync(cmd))
  })

  it('getWithFullCmd ia32', function () {
    let setup
    try {
      setup = getter._forTesting.getWithFullCmd('ia32')
    } catch (e) {
      assert(e.message.includes('No Visual Studio found'))
      this.skip()
    }

    const cmd = setup.CmdPath
    const parts = cmd.split('\\')
    assert(parts.length >= 4)
    assert(parts.pop().match(/vs|vars/i))
    assert(fs.existsSync(cmd))
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
  before(function () {
    const version = getter.getMSVSVersion()
    if (version === 'auto') return this.skip()
  })

  function testEnvGen (arch, noCache) {
    return function () {
      let env
      try {
        env = getter.resolveDevEnvironment(arch, noCache)
      } catch (e) {
        if (!e.message.includes('could not be setup for')) throw e
        console.log(e.message)
        return
      }
      assert(env, 'didn\'t get ENVIRONMENT :(')
      const VCINSTALLDIR = Object.keys(env).find(k => k.includes('VCINSTALLDIR'))
      assert(VCINSTALLDIR, 'didn\'t get VCINSTALLDIR :( env:\n' + JSON.stringify(env, null, '  '))
      if (env['VisualStudioVersion'] === '15.0') {
        assert.equal(env['VSCMD_ARG_TGT_ARCH'], arch)
        assert(env['__VSCMD_PREINIT_PATH'], 'Last env var should be __VSCMD_PREINIT_PATH')
      }
    }
  }

  it('resolve for x64 - no cache', testEnvGen('x64', true))

  it('resolve for x64', testEnvGen('x64'))

  it('resolve for x86 - no cache', testEnvGen('x86', true))

  it('resolve for x86', testEnvGen('x86'))
})
