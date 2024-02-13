// RM Devices (without RF support)
import {DeviceType} from './types/devicetype';

// RM Devices (without RF support)
export const rmDeviceTypes: DeviceType = {
    [parseInt(`0x2737`, 16)]: 'Broadlink RM3 Mini',
    [parseInt(`0x6507`, 16)]: 'Broadlink RM3 Mini',
    [parseInt(`0x27c7`, 16)]: 'Broadlink RM3 Mini A',
    [parseInt(`0x27c2`, 16)]: 'Broadlink RM3 Mini B',
    [parseInt(`0x6508`, 16)]: 'Broadlink RM3 Mini D',
    [parseInt(`0x27de`, 16)]: 'Broadlink RM3 Mini C',
    [parseInt(`0x5f36`, 16)]: 'Broadlink RM3 Mini B',
    [parseInt(`0x27d3`, 16)]: 'Broadlink RM3 Mini KR',
    [parseInt(`0x273d`, 16)]: 'Broadlink RM Pro Phicomm',
    [parseInt(`0x2712`, 16)]: 'Broadlink RM2',
    [parseInt(`0x2783`, 16)]: 'Broadlink RM2 Home Plus',
    [parseInt(`0x277c`, 16)]: 'Broadlink RM2 Home Plus GDT',
    [parseInt(`0x278f`, 16)]: 'Broadlink RM Mini Shate',
    [parseInt(`0x2221`, 16)]: 'Manual RM Device',
};

// RM Devices (with RF support)
export const rmPlusDeviceTypes: DeviceType = {
    [parseInt(`0x272a`, 16)]: 'Broadlink RM2 Pro Plus',
    [parseInt(`0x2787`, 16)]: 'Broadlink RM2 Pro Plus v2',
    [parseInt(`0x278b`, 16)]: 'Broadlink RM2 Pro Plus BL',
    [parseInt(`0x2797`, 16)]: 'Broadlink RM2 Pro Plus HYC',
    [parseInt(`0x27a1`, 16)]: 'Broadlink RM2 Pro Plus R1',
    [parseInt(`0x27a6`, 16)]: 'Broadlink RM2 Pro PP',
    [parseInt(`0x279d`, 16)]: 'Broadlink RM3 Pro Plus',
    [parseInt(`0x27a9`, 16)]: 'Broadlink RM3 Pro Plus v2', // (model RM 3422)
    [parseInt(`0x27c3`, 16)]: 'Broadlink RM3 Pro',
    [parseInt(`0x2223`, 16)]: 'Manual RM Pro Device',
};

// RM4 Devices (without RF support)
export const rm4DeviceTypes: DeviceType = {
    [parseInt(`0x51da`, 16)]: 'Broadlink RM4 Mini',
    [parseInt(`0x610e`, 16)]: 'Broadlink RM4 Mini',
    [parseInt(`0x62bc`, 16)]: 'Broadlink RM4 Mini',
    [parseInt(`0x653a`, 16)]: 'Broadlink RM4 Mini',
    [parseInt(`0x6070`, 16)]: 'Broadlink RM4 Mini C',
    [parseInt(`0x62be`, 16)]: 'Broadlink RM4 Mini C',
    [parseInt(`0x610f`, 16)]: 'Broadlink RM4 Mini C',
    [parseInt(`0x6539`, 16)]: 'Broadlink RM4 Mini C',
    [parseInt(`0x520d`, 16)]: 'Broadlink RM4 Mini C',
    [parseInt(`0x648d`, 16)]: 'Broadlink RM4 Mini S',
    [parseInt(`0x5216`, 16)]: 'Broadlink RM4 Mini',
    [parseInt(`0x520c`, 16)]: 'Broadlink RM4 Mini',
    [parseInt(`0x2225`, 16)]: 'Manual RM4 Device',
};

// RM4 Devices (with RF support)
export const rm4PlusDeviceTypes: DeviceType = {
    [parseInt(`0x5213`, 16)]: 'Broadlink RM4 Pro',
    [parseInt(`0x6026`, 16)]: 'Broadlink RM4 Pro',
    [parseInt(`0x61a2`, 16)]: 'Broadlink RM4 Pro',
    [parseInt(`0x649b`, 16)]: 'Broadlink RM4 Pro',
    [parseInt(`0x653c`, 16)]: 'Broadlink RM4 Pro',
    [parseInt(`0x520b`, 16)]: 'Broadlink RM4 Pro',
    [parseInt(`0x6184`, 16)]: 'Broadlink RM4C Pro',
    [parseInt(`0x2227`, 16)]: 'Manual RM4 Pro Device',
};

// Known Unsupported Devices
export const unsupportedDeviceTypes: DeviceType = {
    [parseInt(`0`, 16)]: 'Broadlink SP1',
    [parseInt(`0x2711`, 16)]: 'Broadlink SP2',
    [parseInt(`0x2719`, 16)]: 'Honeywell SP2',
    [parseInt(`0x7919`, 16)]: 'Honeywell SP2',
    [parseInt(`0x271a`, 16)]: 'Honeywell SP2',
    [parseInt(`0x791a`, 16)]: 'Honeywell SP2',
    [parseInt(`0x2733`, 16)]: 'OEM Branded SP Mini',
    [parseInt(`0x273e`, 16)]: 'OEM Branded SP Mini',
    [parseInt(`0x2720`, 16)]: 'Broadlink SP Mini',
    [parseInt(`0x7d07`, 16)]: 'Broadlink SP Mini',
    [parseInt(`0x753e`, 16)]: 'Broadlink SP 3',
    [parseInt(`0x2728`, 16)]: 'Broadlink SPMini 2',
    [parseInt(`0x2736`, 16)]: 'Broadlink SPMini Plus',
    [parseInt(`0x2714`, 16)]: 'Broadlink A1',
    [parseInt(`0x4eb5`, 16)]: 'Broadlink MP1',
    [parseInt(`0x2722`, 16)]: 'Broadlink S1 (SmartOne Alarm Kit)',
    [parseInt(`0x4e4d`, 16)]:
        'Dooya DT360E (DOOYA_CURTAIN_V2) or Hysen Heating Controller',
    [parseInt(`0x4ead`, 16)]:
        'Dooya DT360E (DOOYA_CURTAIN_V2) or Hysen Heating Controller',
    [parseInt(`0x947a`, 16)]: 'BroadLink Outlet',
};
