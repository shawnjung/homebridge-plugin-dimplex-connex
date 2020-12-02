import { Logger } from 'homebridge';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AuthToken } from './AuthToken';
import { DimplexZone } from './DimplexZone';
import { DevicesResponse, PropertiesResponse } from './interfaces';

export class DimplexApiService {
  private authToken: AuthToken;
  private client: AxiosInstance;

  constructor(email: string, password: string, private log: Logger) {
    this.authToken = new AuthToken({ email, password });
    this.client = this.initClient();
  }

  private initClient(): AxiosInstance {
    const instance: AxiosInstance = axios.create({
      baseURL: 'https://user-field.aylanetworks.com/apiv1',
      timeout: 10000,
      headers: {
        'User-Agent': 'AMAP/6.4.7 (iPhone; iOS 13.3.1; Scale/3.00)',
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    instance.interceptors.request.use(async (request: AxiosRequestConfig) => {
      if (!this.authToken.active) {
        await this.authToken.init();
      } else if (this.authToken.expired) {
        await this.authToken.refresh();
      }
      request.headers[
        'Authorization'
      ] = `auth_token ${this.authToken.getValue()}`;
      return request;
    });

    return instance;
  }

  public async getAvailableZones(): Promise<DimplexZone[]> {
    const output: DimplexZone[] = [];
    const zoneRegexp = /^Z([0-9])Setpoint$/;

    try {
      const devicesResponse: DevicesResponse = await this.client.get(
        'devices.json',
      );

      for (const { device } of devicesResponse.data) {
        const propertiesResponse: PropertiesResponse = await this.client.get(
          `dsns/${device.dsn}/properties.json`,
        );

        for (const { property } of propertiesResponse.data) {
          const matchArray = property.name.match(zoneRegexp);
          if (matchArray) {
            const zoneNumber = parseInt(matchArray[1]);
            output.push(new DimplexZone(device, property, zoneNumber));
          }
        }
      }
    } catch (e) {
      this.log.error('failed to getAvailableZones', e);
    }

    return output;
  }

  public async setTargetTemperture(
    zone: DimplexZone,
    value: number,
  ): Promise<void> {
    zone.setTemperture(value);

    const body = {
      datapoint: {
        value: zone.updateableValue,
      },
    };

    try {
      await this.client.post(
        `properties/${zone.property.key}/datapoints.json`,
        body,
      );
    } catch (e) {
      zone.revertRandomizer();
      throw e;
    }
  }

  public async setState(zone: DimplexZone, value: boolean): Promise<void> {
    zone.setState(value);

    const body = {
      datapoint: {
        value: zone.updateableValue,
      },
    };

    try {
      await this.client.post(
        `properties/${zone.property.key}/datapoints.json`,
        body,
      );
    } catch (e) {
      zone.revertRandomizer();
      throw e;
    }
  }

  public async sync(zone: DimplexZone): Promise<void> {
    zone.updateRandomizer();

    const body = {
      datapoint: {
        value: zone.updateableValue,
      },
    };

    try {
      await this.client.post(
        `properties/${zone.property.key}/datapoints.json`,
        body,
      );
    } catch (e) {
      zone.revertRandomizer();
      throw e;
    }
  }
}
