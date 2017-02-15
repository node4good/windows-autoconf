// powershell -ExecutionPolicy Unrestricted -Version "2.0" -Command "&{ Add-Type -Path Program.cs; [VisualStudioConfiguration.Program]::Main(@())}"
using System;
using System.Runtime.InteropServices;

namespace VisualStudioConfiguration
{
    [Flags]
    public enum InstanceState : uint
    {
        None = 0,
        Local = 1,
        Registered = 2,
        NoRebootRequired = 4,
        NoErrors = 8,
        Complete = 4294967295,
    }

    [Guid("6380BCFF-41D3-4B2E-8B2E-BF8A6810C848")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    [ComImport]
    public interface IEnumSetupInstances
    {

        void Next([MarshalAs(UnmanagedType.U4), In] int celt,
            [MarshalAs(UnmanagedType.LPArray, ArraySubType = UnmanagedType.Interface), Out] ISetupInstance[] rgelt,
            [MarshalAs(UnmanagedType.U4)] out int pceltFetched);

        void Skip([MarshalAs(UnmanagedType.U4), In] int celt);

        void Reset();

        [return: MarshalAs(UnmanagedType.Interface)]
        IEnumSetupInstances Clone();
    }

    [Guid("42843719-DB4C-46C2-8E7C-64F1816EFD5B")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    [ComImport]
    public interface ISetupConfiguration
    {
    }

    [Guid("26AAB78C-4A60-49D6-AF3B-3C35BC93365D")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    [ComImport]
    public interface ISetupConfiguration2 : ISetupConfiguration
    {

        [return: MarshalAs(UnmanagedType.Interface)]
        IEnumSetupInstances EnumInstances();

        [return: MarshalAs(UnmanagedType.Interface)]
        ISetupInstance GetInstanceForCurrentProcess();

        [return: MarshalAs(UnmanagedType.Interface)]
        ISetupInstance GetInstanceForPath([MarshalAs(UnmanagedType.LPWStr), In] string path);

        [return: MarshalAs(UnmanagedType.Interface)]
        IEnumSetupInstances EnumAllInstances();
    }

    [Guid("B41463C3-8866-43B5-BC33-2B0676F7F42E")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    [ComImport]
    public interface ISetupInstance
    {
    }

    [Guid("89143C9A-05AF-49B0-B717-72E218A2185C")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    [ComImport]
    public interface ISetupInstance2 : ISetupInstance
    {
        [return: MarshalAs(UnmanagedType.BStr)]
        string GetInstanceId();

        [return: MarshalAs(UnmanagedType.Struct)]
        System.Runtime.InteropServices.ComTypes.FILETIME GetInstallDate();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetInstallationName();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetInstallationPath();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetInstallationVersion();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetDisplayName([MarshalAs(UnmanagedType.U4), In] int lcid);

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetDescription([MarshalAs(UnmanagedType.U4), In] int lcid);

        [return: MarshalAs(UnmanagedType.BStr)]
        string ResolvePath([MarshalAs(UnmanagedType.LPWStr), In] string pwszRelativePath);

        [return: MarshalAs(UnmanagedType.U4)]
        InstanceState GetState();

        [return: MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_UNKNOWN)]
        ISetupPackageReference[] GetPackages();

        ISetupPackageReference GetProduct();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetProductPath();

        [return: MarshalAs(UnmanagedType.VariantBool)]
        bool IsLaunchable();

        [return: MarshalAs(UnmanagedType.VariantBool)]
        bool IsComplete();

        ISetupPropertyStore GetProperties();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetEnginePath();
    }

    [Guid("DA8D8A16-B2B6-4487-A2F1-594CCCCD6BF5")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    [ComImport]
    public interface ISetupPackageReference
    {

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetId();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetVersion();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetChip();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetLanguage();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetBranch();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetType();

        [return: MarshalAs(UnmanagedType.BStr)]
        string GetUniqueId();

        [return: MarshalAs(UnmanagedType.VariantBool)]
        bool GetIsExtension();
    }

    [Guid("c601c175-a3be-44bc-91f6-4568d230fc83")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    [ComImport]
    public interface ISetupPropertyStore
    {

        [return: MarshalAs(UnmanagedType.SafeArray, SafeArraySubType = VarEnum.VT_BSTR)]
        string[] GetNames();

        object GetValue([MarshalAs(UnmanagedType.LPWStr), In] string pwszName);
    }

    [Guid("42843719-DB4C-46C2-8E7C-64F1816EFD5B")]
    [CoClass(typeof(SetupConfigurationClass))]
    [ComImport]
    public interface SetupConfiguration : ISetupConfiguration2, ISetupConfiguration
    {
    }

    [Guid("177F0C4A-1CD3-4DE7-A32C-71DBBB9FA36D")]
    [ClassInterface(ClassInterfaceType.None)]
    [ComImport]
    public class SetupConfigurationClass
    {
    }

    public static class Program
    {
        public static int Main(string[] args)
        {
            try
            {
                ISetupConfiguration query = new SetupConfiguration();
                ISetupConfiguration2 query2 = (ISetupConfiguration2) query;
                IEnumSetupInstances e = query2.EnumAllInstances();
                ISetupInstance2[] rgelt = new ISetupInstance2[1];
                int pceltFetched;
                do
                {
                    e.Next(1, rgelt, out pceltFetched);
                    if (pceltFetched > 0)
                        PrintInstance(rgelt[0]);
                } while (pceltFetched > 0);
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Error 0x{0:x8}: {1}", ex, ex.Message);
                return 1;
            }
        }

        private static void PrintInstance(ISetupInstance2 setupInstance2)
        {
            Console.WriteLine("InstallationPath: {0}", setupInstance2.GetInstallationPath());
            Console.WriteLine("Product: {0}", setupInstance2.GetProduct().GetId());
            foreach (ISetupPackageReference package in setupInstance2.GetPackages())
            {
                if (package.GetType() != "Exe") continue;
                string id = package.GetId();
                if (id.IndexOf("SDK", StringComparison.Ordinal) == -1) continue;
                string[] parts = id.Split('_');
                if (parts.Length < 2) continue;
                string sdkVer = parts[1];
                char[] chars = {'1', '0', '8'};
                if (sdkVer.IndexOfAny(chars) == -1) continue;
                Console.WriteLine("SDK: {0}", sdkVer);
            }
            Console.WriteLine();
        }
    }
}