import { Device, Property } from './interfaces';

export class DimplexZone {
  public active: boolean;
  public temperature: number;
  private randomizer: number;

  constructor(
    public readonly device: Device,
    public readonly property: Property,
    public readonly number: number,
  ) {
    const value = this.property.value as number;

    if (value >= 10) {
      this.active = true;
      this.temperature = (Math.floor(value / 5) * 5) / 10;
      this.randomizer = value % 5;
    } else {
      this.active = false;
      this.temperature = 10;
      this.randomizer = 0;
    }
  }

  get guid(): string {
    return [this.device.mac, this.property.key].join('-');
  }

  get name(): string {
    return `${this.device.product_name} Zone ${this.number}`;
  }

  public setState(value: boolean): void {
    this.active = value;
    this.updateRandomizer();
  }

  public setTemperture(value: number): void {
    this.temperature = value;
    this.updateRandomizer();
  }

  get updateableValue(): number {
    return (this.active ? this.temperature * 10 : 0) + this.randomizer;
  }

  public updateRandomizer(): void {
    switch (this.randomizer) {
      case 0:
        this.randomizer = 1;
        break;
      case 1:
        this.randomizer = 2;
        break;
      case 2:
        this.randomizer = 0;
        break;
      default:
        this.randomizer = 1;
    }
  }

  public revertRandomizer(): void {
    switch (this.randomizer) {
      case 0:
        this.randomizer = 2;
        break;
      case 1:
        this.randomizer = 0;
        break;
      case 2:
        this.randomizer = 1;
        break;
      default:
        this.randomizer = 0;
    }
  }
}
