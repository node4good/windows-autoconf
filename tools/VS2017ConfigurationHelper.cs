// Copyright 2017 - Refael Ackermann
// Distributed under MIT style license
// See accompanying file LICENSE at https://github.com/node4good/windows-autoconf
// version: 1.11.0

// Usage:
// powershell -ExecutionPolicy Unrestricted -Command "&{ Add-Type (Out-String -InputObject (Get-Content *.cs)); [VisualStudioConfiguration.Program]::Query() }"
namespace VisualStudioConfiguration
{
    using System;
    using System.Collections.Generic;

    public static class Program
    {
        public static int Main(string[] args)
        {
            Query();
            return 0;
        }

        public static void Query()
        {
            try {
                IEnumerable<VSInstance> insts = VisualStudioConfiguration.ComSurrogate.QueryEx();
                Console.Write(ToJSON(insts));
            } catch (Exception e) {
                Console.Error.Write(e.ToString());
            }
        }

        public static string ToJSON(VSInstance inst)
        {
            List<string> outStrings = new List<string>();
            List<string> keys = new List<string>(inst.Keys);
            keys.Sort();
            foreach (string key in keys)
            {
                string line = '"' + key + "\": ";
                switch (inst[key].GetType().Name)
                {
                    case "String":
                        string str = ((String)inst[key]).Replace("\\", "\\\\");
                        if (str.Trim().IndexOf('{') == 0) line += str;
                        else line += '"' + str + '"';
                        break;

                    case "String[]":
                        line += "[\n    " + String.Join(",\n    ", (string[])inst[key]) + "    \n    ]";
                        break;

                    case "Boolean":
                        line += (Boolean)inst[key] ? "true" : "false";
                        break;

                    default:
                        line = null;
                        break;
                }
                if (line != null) outStrings.Add(line);
            }
            return "{\n        " + String.Join(",\n        ", outStrings.ToArray()) + "\n    }";
        }


        public static string ToJSON(IEnumerable<VSInstance> insts)
        {
            List<string> outStrings = new List<string>();
            foreach (VSInstance inst in insts)
            {
                outStrings.Add(ToJSON(inst));
            }
            return "    [\n    " + String.Join(",\n    ", outStrings.ToArray()) + "    \n    ]";
        }
    }
}
