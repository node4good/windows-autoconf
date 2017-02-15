'use strict';
/**
 * @namespace vsSetup
 * @property {String} InstallationPath
 * @property {String} SDK
 */


function getVS2017Path (hostBits, target_arch, bindings) {
  module.exports._forTesting = {tryVS7_powershell, tryVS7_CSC, tryVS7_registry};

  if (!bindings) bindings = {
    path: require('path'),
    log: console.log.bind(console),
    execSync: require('child_process').execSync()
  };

  function tryVS7_powershell () {
    try {
      const cs = bindings.path.join(__dirname, 'tools', 'Get-VS7.cs');
      const cmd = `powershell -Command \
      "&{ Add-Type -Path '${cs}' ; [VisualStudioConfiguration.Main]::Query()}"`;
      const vsSetupRaw = bindings.execSync(cmd).toString();
      if (!vsSetupRaw) return;
      const vsSetup = vsSetupRaw.split(/[\r|\n]+/g).reduce((s, l) => {
        const lParts = l.split(': ');
        if (lParts.length > 1) s[lParts[0]] = lParts[1];
        return s;
      }, {});
      return vsSetup.InstallationPath;
    } catch (e) {
      bindings.log('Couldn\'t find VS7 with powershell', e.message);
    }
  }

  function tryVS7_CSC () {
    const VREG = /.*v(\d+\.\d+).*/;
    const dirCMD = 'dir /b /s %windir%\\Microsoft.NET\\Framework\\csc.exe';
    try {
      const files = bindings.execSync(dirCMD)
        .toString()
        .trim()
        .split(/[\r|\n]+/g)
        .map(f => [Number(f.replace(VREG, '$1')), f]);
      const maxVer = Math.max.apply(Math, files.map(v => v[0]));
      const cscPath = files.find(v => v[0] === maxVer)[1];
      const toolsPath = bindings.path.join(__dirname, 'tools');
      const csPath = bindings.path.join(toolsPath, 'Get-VS7.cs');
      const exePath = bindings.path.join(toolsPath, 'Get-VS7.exe');
      bindings.execSync(`${cscPath} /out:${exePath} ${csPath}`);
      const vsSetupRaw = bindings.execSync(exePath).toString();
      const vsSetup = vsSetupRaw.split(/[\r|\n]/g).reduce((s, l) => {
        const lParts = l.split(': ');
        if (lParts.length > 1) s[lParts[0]] = lParts[1];
        return s;
      }, {});
      return vsSetup.InstallationPath;
    } catch (e) {
      bindings.log('Couldn\'t find VS7 with a compiled exe', e.message);
    }
  }

  function tryVS7_registry () {
    const magicKey = String.raw`HKLM\Software\Microsoft\VisualStudio\SxS\VS7`;
    const magicQuery = `reg query ${magicKey} /reg:32`;
    const qRet = bindings.execSync(magicQuery).toString().trim();
    if (qRet.includes('ERROR')) {
      bindings.log('Couldn\'t find VS7 in registry:(');
      return;
    }
    const values = qRet.split(/[\r|\n]+/g).slice(1);
    const ret = values.map(v => {
      const parts = v.trim().replace(/\s+/g, ' ').split(' ');
      return [Number(parts[0]), parts[2]];
    });
    if (!ret.length) {
      bindings.log('Couldn\'t find VS7 in registry');
      return;
    }
    const maxVer = Math.max.apply(Math, ret.map(v => v[0]));
    return ret.find(v => v[0] === maxVer)[1];
  }

  const btPath = tryVS7_powershell() || tryVS7_CSC() || tryVS7_registry();
  if (!btPath) {
    bindings.log('Couldn\'t find VS7 :(');
    return;
  }
  const VsDevCmd = bindings.path.join(btPath, 'Common7', 'Tools', 'VsDevCmd.bat');
  const argArch = target_arch === 'x64' ? 'amd64' : 'x86';
  const argHost = hostBits === 64 ? 'amd64' : 'x86';
  return `${VsDevCmd} -arch=${argArch} -host_arch=${argHost} -no_logo`;
}

module.exports = {
  try_powershell_path: __dirname + '\\tools\\try_powershell.cmd',
  compile_run_path: __dirname + '\\tools\\compile-run.cmd',
  try_registry_path: __dirname + '\\tools\\try_registry.cmd',
  getVS2017Path
}
