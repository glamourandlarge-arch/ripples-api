import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { City } from './city.entity.js';
import { Country } from './country.entity.js';
import {
  DEFAULT_REGIONS_DATA_URL,
  parseCoordinate,
  type RemoteCountry,
} from './regions-data.types.js';
import { State } from './state.entity.js';

const INSERT_CHUNK = 500;

@Injectable()
export class RegionsSeedService implements OnModuleInit {
  private readonly logger = new Logger(RegionsSeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Country)
    private readonly countries: Repository<Country>,
    @InjectRepository(State)
    private readonly states: Repository<State>,
    @InjectRepository(City)
    private readonly cities: Repository<City>,
  ) {}

  async onModuleInit() {
    if (this.config.get<boolean>('REGIONS_SEED_ON_BOOT') !== true) {
      return;
    }

    await this.seedFromRemoteIfEmpty();
  }

  async seedFromRemoteIfEmpty(): Promise<{
    countries: number;
    states: number;
    cities: number;
    skipped: boolean;
  }> {
    const existing = await this.countries.count();
    if (existing > 0) {
      this.logger.log(
        `Regions already seeded (${existing} countries); skipping download`,
      );
      return { countries: existing, states: 0, cities: 0, skipped: true };
    }

    return this.seedFromRemote();
  }

  async seedFromRemote(): Promise<{
    countries: number;
    states: number;
    cities: number;
    skipped: boolean;
  }> {
    const url =
      this.config.get<string>('REGIONS_DATA_URL') ?? DEFAULT_REGIONS_DATA_URL;
    this.logger.log(`Downloading global regions dataset from ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download regions data: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as RemoteCountry[];
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new Error('Regions dataset was empty or invalid');
    }

    return this.persistDataset(payload);
  }

  async persistDataset(payload: RemoteCountry[]): Promise<{
    countries: number;
    states: number;
    cities: number;
    skipped: boolean;
  }> {
    const countryRows: Array<Partial<Country> & { id: string }> = [];
    const stateRows: Array<Partial<State> & { id: string }> = [];
    const cityRows: Array<Partial<City> & { id: string }> = [];
    const countryIdBySource = new Map<number, string>();
    const stateIdBySource = new Map<number, string>();

    for (const country of payload) {
      if (
        typeof country.id !== 'number' ||
        !country.name ||
        !country.iso2 ||
        !country.iso3
      ) {
        continue;
      }

      const countryId = randomUUID();
      countryIdBySource.set(country.id, countryId);
      countryRows.push({
        id: countryId,
        sourceId: country.id,
        name: country.name.trim(),
        iso2: country.iso2.trim().toUpperCase(),
        iso3: country.iso3.trim().toUpperCase(),
        phoneCode: country.phonecode?.toString().trim() || null,
        currency: country.currency?.trim() || null,
        capital: country.capital?.trim() || null,
        region: country.region?.trim() || null,
        subregion: country.subregion?.trim() || null,
        emoji: country.emoji ?? null,
        latitude: parseCoordinate(country.latitude),
        longitude: parseCoordinate(country.longitude),
      });

      for (const state of country.states ?? []) {
        if (typeof state.id !== 'number' || !state.name) {
          continue;
        }

        const stateId = randomUUID();
        stateIdBySource.set(state.id, stateId);
        stateRows.push({
          id: stateId,
          sourceId: state.id,
          countryId,
          name: state.name.trim(),
          iso2: state.iso2?.trim() || null,
          type: state.type?.trim() || null,
          latitude: parseCoordinate(state.latitude),
          longitude: parseCoordinate(state.longitude),
        });

        for (const city of state.cities ?? []) {
          if (typeof city.id !== 'number' || !city.name) {
            continue;
          }

          cityRows.push({
            id: randomUUID(),
            sourceId: city.id,
            stateId,
            countryId,
            name: city.name.trim(),
            latitude: parseCoordinate(city.latitude),
            longitude: parseCoordinate(city.longitude),
          });
        }
      }
    }

    await this.insertChunks(this.countries, countryRows, 'countries');
    await this.insertChunks(this.states, stateRows, 'states');
    await this.insertChunks(this.cities, cityRows, 'cities');

    this.logger.log(
      `Seeded regions: ${countryRows.length} countries, ${stateRows.length} states, ${cityRows.length} cities`,
    );

    return {
      countries: countryRows.length,
      states: stateRows.length,
      cities: cityRows.length,
      skipped: false,
    };
  }

  private async insertChunks<T extends object>(
    repository: Repository<T>,
    rows: T[],
    label: string,
  ): Promise<void> {
    for (let index = 0; index < rows.length; index += INSERT_CHUNK) {
      const chunk = rows.slice(index, index + INSERT_CHUNK);
      await repository.insert(chunk as never);
      if ((index / INSERT_CHUNK) % 20 === 0 && index > 0) {
        this.logger.log(`Inserted ${index}/${rows.length} ${label}`);
      }
    }
  }
}
