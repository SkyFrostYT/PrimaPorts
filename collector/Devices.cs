// PrimaPorts — liste native des périphériques présents (SetupAPI), en un seul passage.
// Remplace Win32_PnPEntity + GetDeviceProperties : ~10× plus rapide que CIM.
// Compilé à la volée par collect.ps1 (Add-Type, C# 5 : compatible Windows PowerShell 5.1).
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace PrimaPorts
{
    public class DeviceNode
    {
        public string InstanceId, Name, Class, Service, Manufacturer, BusDesc, Parent;
        public int Problem;
        public long Address = -1;
        public bool InLocalMachine;
        public bool BtConnected;
        public long BtClassOfDevice;
        public int BtBattery = -1;
    }

    public static class Devices
    {
        [StructLayout(LayoutKind.Sequential)]
        struct SP_DEVINFO_DATA { public int cbSize; public Guid ClassGuid; public int DevInst; public IntPtr Reserved; }
        [StructLayout(LayoutKind.Sequential)]
        struct DEVPROPKEY { public Guid fmtid; public uint pid; public DEVPROPKEY(string g, uint p) { fmtid = new Guid(g); pid = p; } }

        const int DIGCF_PRESENT = 0x2, DIGCF_ALLCLASSES = 0x4;
        const uint TYPE_UINT32 = 0x7, TYPE_BYTE = 0x3, TYPE_BOOL = 0x11, TYPE_STRING = 0x12;

        static readonly DEVPROPKEY DeviceDesc = new DEVPROPKEY("a45c254e-df1c-4efd-8020-67d146a850e0", 2);
        static readonly DEVPROPKEY Service = new DEVPROPKEY("a45c254e-df1c-4efd-8020-67d146a850e0", 6);
        static readonly DEVPROPKEY ClassName = new DEVPROPKEY("a45c254e-df1c-4efd-8020-67d146a850e0", 9);
        static readonly DEVPROPKEY Manufacturer = new DEVPROPKEY("a45c254e-df1c-4efd-8020-67d146a850e0", 13);
        static readonly DEVPROPKEY FriendlyName = new DEVPROPKEY("a45c254e-df1c-4efd-8020-67d146a850e0", 14);
        static readonly DEVPROPKEY Address = new DEVPROPKEY("a45c254e-df1c-4efd-8020-67d146a850e0", 30);
        static readonly DEVPROPKEY BusDesc = new DEVPROPKEY("540b947e-8b40-45bc-a8a2-6a0b894cbda2", 4);
        static readonly DEVPROPKEY ProblemCode = new DEVPROPKEY("4340a6c5-93fa-4706-972c-7b648008a5a7", 3);
        static readonly DEVPROPKEY Parent = new DEVPROPKEY("4340a6c5-93fa-4706-972c-7b648008a5a7", 8);
        static readonly DEVPROPKEY InLocalMachine = new DEVPROPKEY("8c7ed206-3f8a-4827-b3ab-ae9e1faefc6c", 4);
        static readonly DEVPROPKEY BtConnected = new DEVPROPKEY("83da6326-97a6-4088-9453-a1923f573b29", 15);
        static readonly DEVPROPKEY BtCod = new DEVPROPKEY("2bd67d8b-8beb-48d5-87e0-6cda3428040a", 10);
        static readonly DEVPROPKEY BtBattery = new DEVPROPKEY("104ea319-6ee2-4701-bd47-8ddbf425bbe5", 2);

        [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern IntPtr SetupDiGetClassDevs(IntPtr guid, string enumerator, IntPtr parent, int flags);
        [DllImport("setupapi.dll", SetLastError = true)]
        static extern bool SetupDiEnumDeviceInfo(IntPtr set, int index, ref SP_DEVINFO_DATA info);
        [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern bool SetupDiGetDeviceInstanceId(IntPtr set, ref SP_DEVINFO_DATA info, StringBuilder id, int size, out int required);
        [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern bool SetupDiGetDevicePropertyW(IntPtr set, ref SP_DEVINFO_DATA info, ref DEVPROPKEY key, out uint type, byte[] buf, int size, out int required, int flags);
        [DllImport("setupapi.dll")]
        static extern bool SetupDiDestroyDeviceInfoList(IntPtr set);

        public static List<DeviceNode> Read()
        {
            var list = new List<DeviceNode>();
            IntPtr set = SetupDiGetClassDevs(IntPtr.Zero, null, IntPtr.Zero, DIGCF_PRESENT | DIGCF_ALLCLASSES);
            if (set == new IntPtr(-1)) return list;
            var buf = new byte[2048];
            var sb = new StringBuilder(512);
            try
            {
                for (int i = 0; ; i++)
                {
                    var info = new SP_DEVINFO_DATA(); info.cbSize = Marshal.SizeOf(info);
                    if (!SetupDiEnumDeviceInfo(set, i, ref info)) break;
                    int req;
                    sb.Length = 0;
                    if (!SetupDiGetDeviceInstanceId(set, ref info, sb, sb.Capacity, out req)) continue;
                    var d = new DeviceNode { InstanceId = sb.ToString() };
                    d.Name = Str(set, ref info, FriendlyName, buf) ?? Str(set, ref info, DeviceDesc, buf);
                    d.Class = Str(set, ref info, ClassName, buf);
                    d.Service = Str(set, ref info, Service, buf);
                    d.Manufacturer = Str(set, ref info, Manufacturer, buf);
                    d.BusDesc = Str(set, ref info, BusDesc, buf);
                    d.Parent = Str(set, ref info, Parent, buf);
                    d.Problem = (int)Num(set, ref info, ProblemCode, buf, 0);
                    d.Address = Num(set, ref info, Address, buf, -1);
                    d.InLocalMachine = Num(set, ref info, InLocalMachine, buf, 0) != 0;
                    if (d.InstanceId.StartsWith("BTH", StringComparison.OrdinalIgnoreCase))
                    {
                        d.BtConnected = Num(set, ref info, BtConnected, buf, 0) != 0;
                        d.BtClassOfDevice = Num(set, ref info, BtCod, buf, 0);
                        d.BtBattery = (int)Num(set, ref info, BtBattery, buf, -1);
                    }
                    list.Add(d);
                }
            }
            finally { SetupDiDestroyDeviceInfoList(set); }
            return list;
        }

        static string Str(IntPtr set, ref SP_DEVINFO_DATA info, DEVPROPKEY key, byte[] buf)
        {
            uint type; int req;
            if (!SetupDiGetDevicePropertyW(set, ref info, ref key, out type, buf, buf.Length, out req, 0) || type != TYPE_STRING || req < 2) return null;
            return Encoding.Unicode.GetString(buf, 0, req - 2);
        }

        static long Num(IntPtr set, ref SP_DEVINFO_DATA info, DEVPROPKEY key, byte[] buf, long fallback)
        {
            uint type; int req;
            if (!SetupDiGetDevicePropertyW(set, ref info, ref key, out type, buf, buf.Length, out req, 0)) return fallback;
            if (type == TYPE_UINT32) return BitConverter.ToUInt32(buf, 0);
            if (type == TYPE_BYTE) return buf[0];
            if (type == TYPE_BOOL) return buf[0] != 0 ? 1 : 0;
            return fallback;
        }
    }
}
