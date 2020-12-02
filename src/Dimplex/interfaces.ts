export interface Setting {
  dimplexEmail: string;
  dimplexPassword: string;
  syncInterval: number;
}

export interface Device {
  product_name: string;
  dsn: string;
  mac: string;
  connection_status: string;
}

export interface Property {
  key: number;
  name: string;
  device_key: number;
  value: unknown;
}

export interface DeviceWrapper {
  device: Device;
}

export interface PropertyWrapper {
  property: Property;
}

export interface DevicesResponse {
  data: DeviceWrapper[];
}

export interface PropertyResponse {
  data: PropertyWrapper;
}

export interface PropertiesResponse {
  data: PropertyWrapper[];
}
