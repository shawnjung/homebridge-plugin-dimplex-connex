import {
  Service,
  PlatformAccessory,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
} from 'homebridge';

import { DimplexHomebridgePlatform } from '../platform';
import { DimplexZone } from './DimplexZone';
import { DimplexApiService } from './DimplexApiService';

export class DimplexZoneHandler {
  private service: Service;

  constructor(
    private readonly platform: DimplexHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private zone: DimplexZone,
    private apiService: DimplexApiService,
  ) {
    const {
      Manufacturer,
      Model,
      SerialNumber,
      Name,
      CurrentHeatingCoolingState,
      TargetHeatingCoolingState,
      CurrentTemperature,
      TargetTemperature,
    } = this.platform.Characteristic;

    const { AccessoryInformation, Thermostat } = this.platform.Service;

    this.accessory.UUID = zone.guid;

    // set accessory information
    this.accessory
      .getService(AccessoryInformation)!
      .setCharacteristic(Manufacturer, 'Dimplex')
      .setCharacteristic(Model, 'Connex Zone')
      .setCharacteristic(SerialNumber, zone.guid);

    this.service =
      this.accessory.getService(Thermostat) ||
      this.accessory.addService(Thermostat);

    this.service.setCharacteristic(Name, zone.name);

    this.service
      .getCharacteristic(CurrentHeatingCoolingState)
      .on('get', this.getCurrentState.bind(this));

    this.service
      .getCharacteristic(TargetHeatingCoolingState)
      .on('get', this.getTargetState.bind(this))
      .on('set', this.setTargetState.bind(this));

    this.service
      .getCharacteristic(CurrentTemperature)
      .on('get', this.getTargetTemperture.bind(this));

    this.service
      .getCharacteristic(TargetTemperature)
      .on('get', this.getTargetTemperture.bind(this))
      .on('set', this.setTargetTemperture.bind(this));
  }

  getCurrentState(callback: CharacteristicGetCallback): void {
    const { CurrentHeatingCoolingState } = this.platform.Characteristic;
    const value = this.zone.active
      ? CurrentHeatingCoolingState.HEAT
      : CurrentHeatingCoolingState.OFF;
    this.platform.log.debug(`Get CurrentState of ${this.zone.name} -> `, value);
    callback(null, value);
  }

  getTargetState(callback: CharacteristicGetCallback): void {
    const { TargetHeatingCoolingState } = this.platform.Characteristic;
    const value = this.zone.active
      ? TargetHeatingCoolingState.HEAT
      : TargetHeatingCoolingState.OFF;
    this.platform.log.debug(`Get TargetState of ${this.zone.name} -> `, value);
    callback(null, value);
  }

  async setTargetState(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ): Promise<void> {
    const { TargetHeatingCoolingState } = this.platform.Characteristic;

    try {
      // dimplex connex only support heating
      switch (value) {
        case TargetHeatingCoolingState.HEAT:
        case TargetHeatingCoolingState.AUTO:
          await this.apiService.setState(this.zone, true);
          this.platform.log.debug(
            `Set TargetState of ${this.zone.name} -> `,
            'HEAT',
          );
          break;
        default:
          await this.apiService.setState(this.zone, false);
          this.platform.log.debug(
            `Set TargetState of ${this.zone.name} -> `,
            'OFF',
          );
      }
      callback(null);
    } catch (e) {
      this.platform.log.error(`Failed to set TargetState of ${this.zone.name}`);
      callback(e);
    }
  }

  getCurrentTemperture(callback: CharacteristicGetCallback): void {
    const value = this.zone.temperature;
    this.platform.log.debug(
      `Get CurrentTemperture of ${this.zone.name} -> `,
      value,
    );
    callback(null, value);
  }

  getTargetTemperture(callback: CharacteristicGetCallback): void {
    const value = this.zone.temperature;
    this.platform.log.debug(
      `Get TargetTemperture of ${this.zone.name} -> `,
      value,
    );
    callback(null, value);
  }

  async setTargetTemperture(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ): Promise<void> {
    try {
      await this.apiService.setTargetTemperture(this.zone, value as number);
      this.platform.log.debug(
        `Set CurrentTemperature of ${this.zone.name} -> `,
        value,
      );
      callback(null);
    } catch (e) {
      this.platform.log.error(
        `Failed to set TargetTemperature of ${this.zone.name}`,
      );
      callback(e);
    }
  }
}
