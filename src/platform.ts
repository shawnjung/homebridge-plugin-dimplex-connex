import includes from 'lodash/includes';

import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { Setting } from './Dimplex/interfaces';
import { DimplexZone } from './Dimplex/DimplexZone';
import { DimplexApiService } from './Dimplex/DimplexApiService';
import { DimplexZoneHandler } from './Dimplex/DimplexZoneHandler';

export class DimplexHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap
    .Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  public readonly dimplexZones: DimplexZone[] = [];
  private dimplexApiService: DimplexApiService;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    const { dimplexEmail, dimplexPassword, syncInterval } = (this
      .config as unknown) as Setting;
    this.dimplexApiService = new DimplexApiService(
      dimplexEmail,
      dimplexPassword,
      this.log,
    );

    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      await this.discoverDevices();
      this.setSchedulerToSyncZones(syncInterval);
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  async discoverDevices(): Promise<void> {
    const zones = await this.dimplexApiService.getAvailableZones();
    const activeAccessoryUUIDs: string[] = [];

    for (const zone of zones) {
      const uuid = this.api.hap.uuid.generate(zone.guid);
      const existingAccessory = this.accessories.find(
        (accessory) => accessory.UUID === uuid,
      );

      if (existingAccessory) {
        this.log.info(
          'Restoring existing zone from cache:',
          existingAccessory.displayName,
        );

        new DimplexZoneHandler(
          this,
          existingAccessory,
          zone,
          this.dimplexApiService,
        );
        this.api.updatePlatformAccessories([existingAccessory]);
        activeAccessoryUUIDs.push(existingAccessory.UUID);
      } else {
        this.log.info('Adding new zone:', zone.name);

        const accessory = new this.api.platformAccessory(zone.name, uuid);
        new DimplexZoneHandler(this, accessory, zone, this.dimplexApiService);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
        activeAccessoryUUIDs.push(accessory.UUID);
      }
      this.dimplexZones.push(zone);
    }

    this.accessories.forEach((accessory: PlatformAccessory) => {
      if (!includes(activeAccessoryUUIDs, accessory.UUID)) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
        this.log.info(
          'Removing existing accessory from cache:',
          accessory.displayName,
        );
      }
    });
  }

  setSchedulerToSyncZones(syncInterval: number) {
    if (syncInterval && syncInterval > 0) {
      setInterval(async () => {
        for (const zone of this.dimplexZones) {
          try {
            await this.dimplexApiService.sync(zone);
            this.log.info(
              `Synced a temperature of ${zone.name} -> `,
              zone.updateableValue,
            );
          } catch (e) {
            this.log.error(
              `Failed to sync a temperature of ${zone.name} -> `,
              zone.updateableValue,
            );
          }
        }
      }, syncInterval * 60 * 1000);
      this.log.info(
        `Started a scheduler to sync ${this.dimplexZones.length} Dimplex Zones every ${syncInterval} minutes.`,
      );
    } else {
      this.log.info(
        `Didn't start a sync scheduler due to syncInterval(${syncInterval}) is lower than 0`,
      );
    }
  }
}
