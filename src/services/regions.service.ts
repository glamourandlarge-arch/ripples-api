import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { City } from '../regions/city.entity.js';
import { Country } from '../regions/country.entity.js';
import { State } from '../regions/state.entity.js';

export type CountryResponse = {
  id: string;
  name: string;
  iso2: string;
  iso3: string;
  phoneCode: string | null;
  currency: string | null;
  capital: string | null;
  region: string | null;
  subregion: string | null;
  emoji: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type StateResponse = {
  id: string;
  countryId: string;
  name: string;
  iso2: string | null;
  type: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type CityResponse = {
  id: string;
  stateId: string;
  countryId: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(Country)
    private readonly countries: Repository<Country>,
    @InjectRepository(State)
    private readonly states: Repository<State>,
    @InjectRepository(City)
    private readonly cities: Repository<City>,
  ) {}

  async listCountries(query?: string): Promise<CountryResponse[]> {
    const rows = await this.countries.find({
      where: query?.trim()
        ? [{ name: ILike(`%${query.trim()}%`) }, { iso2: ILike(query.trim()) }]
        : undefined,
      order: { name: 'ASC' },
    });
    return rows.map((row) => toCountryResponse(row));
  }

  async getCountry(id: string): Promise<CountryResponse> {
    const row = await this.countries.findOneBy({ id });
    if (!row) {
      throw new NotFoundException('Country not found');
    }
    return toCountryResponse(row);
  }

  async listStatesByCountry(countryId: string): Promise<StateResponse[]> {
    await this.ensureCountry(countryId);
    const rows = await this.states.find({
      where: { countryId },
      order: { name: 'ASC' },
    });
    return rows.map((row) => toStateResponse(row));
  }

  async getState(id: string): Promise<StateResponse> {
    const row = await this.states.findOneBy({ id });
    if (!row) {
      throw new NotFoundException('State not found');
    }
    return toStateResponse(row);
  }

  async listCitiesByState(stateId: string): Promise<CityResponse[]> {
    await this.ensureState(stateId);
    const rows = await this.cities.find({
      where: { stateId },
      order: { name: 'ASC' },
    });
    return rows.map((row) => toCityResponse(row));
  }

  private async ensureCountry(id: string): Promise<void> {
    const exists = await this.countries.existsBy({ id });
    if (!exists) {
      throw new NotFoundException('Country not found');
    }
  }

  private async ensureState(id: string): Promise<void> {
    const exists = await this.states.existsBy({ id });
    if (!exists) {
      throw new NotFoundException('State not found');
    }
  }
}

export function toCountryResponse(country: Country): CountryResponse {
  return {
    id: country.id,
    name: country.name,
    iso2: country.iso2,
    iso3: country.iso3,
    phoneCode: country.phoneCode,
    currency: country.currency,
    capital: country.capital,
    region: country.region,
    subregion: country.subregion,
    emoji: country.emoji,
    latitude: country.latitude,
    longitude: country.longitude,
  };
}

export function toStateResponse(state: State): StateResponse {
  return {
    id: state.id,
    countryId: state.countryId,
    name: state.name,
    iso2: state.iso2,
    type: state.type,
    latitude: state.latitude,
    longitude: state.longitude,
  };
}

export function toCityResponse(city: City): CityResponse {
  return {
    id: city.id,
    stateId: city.stateId,
    countryId: city.countryId,
    name: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
  };
}
