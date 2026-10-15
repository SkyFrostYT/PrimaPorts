// PrimaPorts — lecture de la topologie USB via les IOCTL des hubs (comme USBView).
// Compilé à la volée par collect.ps1 (Add-Type, C# 5 : compatible Windows PowerShell 5.1).
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

namespace PrimaPorts
{
    public class UsbPort
    {
        public string HubInstanceId;
        public bool HubIsRoot;
        public int Port;
        public bool Connected;
        public int Speed;              // 0 low, 1 full, 2 high, 3 super
        public bool SuperSpeedPlus;
        public bool PortSupportsUsb3;
        public bool UserConnectable;
        public bool TypeC;
        public int CompanionPort;      // 0 = aucune
        public int Vid, Pid, BcdUsb;
        public bool IsHub;
        public int MaxPowerMa = -1;
        public bool SelfPowered;
    }

    public static class UsbTopology
    {
        static readonly Guid HubInterface = new Guid("f18a0e88-c30c-11d0-8815-00a0c906bed8");
        const int DIGCF_PRESENT = 0x2, DIGCF_DEVICEINTERFACE = 0x10;
        const uint IOCTL_NODE_INFORMATION = 0x220408;
        const uint IOCTL_DESCRIPTOR = 0x220410;
        const uint IOCTL_CONNECTION_EX = 0x220448;
        const uint IOCTL_CONNECTOR_PROPERTIES = 0x220458;
        const uint IOCTL_CONNECTION_EX_V2 = 0x22045C;

        [StructLayout(LayoutKind.Sequential)]
        struct SP_DEVICE_INTERFACE_DATA { public int cbSize; public Guid InterfaceClassGuid; public int Flags; public IntPtr Reserved; }
        [StructLayout(LayoutKind.Sequential)]
        struct SP_DEVINFO_DATA { public int cbSize; public Guid ClassGuid; public int DevInst; public IntPtr Reserved; }

        [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern IntPtr SetupDiGetClassDevs(ref Guid g, IntPtr e, IntPtr h, int flags);
        [DllImport("setupapi.dll", SetLastError = true)]
        static extern bool SetupDiEnumDeviceInterfaces(IntPtr set, IntPtr info, ref Guid g, int i, ref SP_DEVICE_INTERFACE_DATA d);
        [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern bool SetupDiGetDeviceInterfaceDetail(IntPtr set, ref SP_DEVICE_INTERFACE_DATA d, IntPtr detail, int size, out int required, ref SP_DEVINFO_DATA info);
        [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern bool SetupDiGetDeviceInstanceId(IntPtr set, ref SP_DEVINFO_DATA info, StringBuilder id, int size, out int required);
        [DllImport("setupapi.dll")]
        static extern bool SetupDiDestroyDeviceInfoList(IntPtr set);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern SafeFileHandle CreateFile(string name, uint access, uint share, IntPtr sa, uint disp, uint flags, IntPtr tmpl);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool DeviceIoControl(SafeFileHandle h, uint code, byte[] inBuf, int inSize, byte[] outBuf, int outSize, out int returned, IntPtr ov);

        public static List<UsbPort> Read()
        {
            var result = new List<UsbPort>();
            Guid g = HubInterface;
            IntPtr set = SetupDiGetClassDevs(ref g, IntPtr.Zero, IntPtr.Zero, DIGCF_PRESENT | DIGCF_DEVICEINTERFACE);
            if (set == new IntPtr(-1)) return result;
            try
            {
                for (int i = 0; ; i++)
                {
                    var ifd = new SP_DEVICE_INTERFACE_DATA(); ifd.cbSize = Marshal.SizeOf(ifd);
                    if (!SetupDiEnumDeviceInterfaces(set, IntPtr.Zero, ref g, i, ref ifd)) break;
                    var info = new SP_DEVINFO_DATA(); info.cbSize = Marshal.SizeOf(info);
                    int req;
                    SetupDiGetDeviceInterfaceDetail(set, ref ifd, IntPtr.Zero, 0, out req, ref info);
                    IntPtr buf = Marshal.AllocHGlobal(req);
                    string path;
                    try
                    {
                        Marshal.WriteInt32(buf, IntPtr.Size == 8 ? 8 : 6);
                        if (!SetupDiGetDeviceInterfaceDetail(set, ref ifd, buf, req, out req, ref info)) continue;
                        path = Marshal.PtrToStringUni(new IntPtr(buf.ToInt64() + 4));
                    }
                    finally { Marshal.FreeHGlobal(buf); }
                    var sb = new StringBuilder(512);
                    SetupDiGetDeviceInstanceId(set, ref info, sb, sb.Capacity, out req);
                    try { ReadHub(path, sb.ToString(), result); } catch { }
                }
            }
            finally { SetupDiDestroyDeviceInfoList(set); }
            return result;
        }

        static void ReadHub(string path, string instanceId, List<UsbPort> result)
        {
            using (var h = CreateFile(path, 0x40000000, 0x2, IntPtr.Zero, 3, 0, IntPtr.Zero))
            {
                if (h.IsInvalid) return;
                var node = new byte[256]; int ret;
                if (!DeviceIoControl(h, IOCTL_NODE_INFORMATION, node, node.Length, node, node.Length, out ret, IntPtr.Zero)) return;
                // USB_NODE_INFORMATION : NodeType (4) puis USB_HUB_DESCRIPTOR (bLength, bDescriptorType, bNumberOfPorts…)
                int ports = node[6];
                bool isRoot = instanceId.IndexOf("ROOT_HUB", StringComparison.OrdinalIgnoreCase) >= 0;
                for (int p = 1; p <= ports; p++)
                {
                    var port = new UsbPort { HubInstanceId = instanceId, HubIsRoot = isRoot, Port = p };

                    var cp = new byte[512];
                    BitConverter.GetBytes(p).CopyTo(cp, 0);
                    if (DeviceIoControl(h, IOCTL_CONNECTOR_PROPERTIES, cp, cp.Length, cp, cp.Length, out ret, IntPtr.Zero))
                    {
                        uint props = BitConverter.ToUInt32(cp, 8);
                        port.UserConnectable = (props & 1) != 0;
                        port.TypeC = (props & 8) != 0;
                        port.CompanionPort = BitConverter.ToUInt16(cp, 14);
                    }

                    var v2 = new byte[16];
                    BitConverter.GetBytes(p).CopyTo(v2, 0);
                    BitConverter.GetBytes(16).CopyTo(v2, 4);
                    BitConverter.GetBytes(7).CopyTo(v2, 8); // USB 1.1 / 2.0 / 3.0 demandés
                    if (DeviceIoControl(h, IOCTL_CONNECTION_EX_V2, v2, v2.Length, v2, v2.Length, out ret, IntPtr.Zero))
                    {
                        uint protocols = BitConverter.ToUInt32(v2, 8), flags = BitConverter.ToUInt32(v2, 12);
                        port.PortSupportsUsb3 = (protocols & 4) != 0;
                        port.SuperSpeedPlus = (flags & 4) != 0;
                    }

                    var ci = new byte[512];
                    BitConverter.GetBytes(p).CopyTo(ci, 0);
                    if (DeviceIoControl(h, IOCTL_CONNECTION_EX, ci, ci.Length, ci, ci.Length, out ret, IntPtr.Zero))
                    {
                        port.Connected = BitConverter.ToUInt32(ci, 31) == 1;
                        if (port.Connected)
                        {
                            port.BcdUsb = BitConverter.ToUInt16(ci, 6);
                            port.Vid = BitConverter.ToUInt16(ci, 12);
                            port.Pid = BitConverter.ToUInt16(ci, 14);
                            port.Speed = ci[23];
                            port.IsHub = ci[24] != 0;
                            ReadPower(h, port);
                        }
                    }
                    result.Add(port);
                }
            }
        }

        static void ReadPower(SafeFileHandle h, UsbPort port)
        {
            // USB_DESCRIPTOR_REQUEST : ConnectionIndex (4) + SetupPacket (8) + données
            var rq = new byte[12 + 9];
            BitConverter.GetBytes(port.Port).CopyTo(rq, 0);
            rq[4] = 0x80; rq[5] = 6;                              // GET_DESCRIPTOR
            BitConverter.GetBytes((ushort)(2 << 8)).CopyTo(rq, 6);  // descripteur de configuration n°0
            BitConverter.GetBytes((ushort)9).CopyTo(rq, 10);
            int ret;
            if (!DeviceIoControl(h, IOCTL_DESCRIPTOR, rq, rq.Length, rq, rq.Length, out ret, IntPtr.Zero) || ret < 12 + 9) return;
            byte attributes = rq[12 + 7], maxPower = rq[12 + 8];
            port.SelfPowered = (attributes & 0x40) != 0;
            port.MaxPowerMa = maxPower * (port.Speed >= 3 ? 8 : 2);
        }
    }
}
