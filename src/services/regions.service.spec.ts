import type { City } from '../regions/city.entity.js';
import type { Country } from '../regions/country.entity.js';
import type { State } from '../regions/state.entity.js';
import {
  toCityResponse,
  toCountryResponse,
  toStateResponse,
} from './regions.service.js';

describe('regions mappers', () => {
  it('maps country, state, and city rows', () => {
    const country = {
      id: 'country-1',
      name: 'Canada',
      iso2: 'CA',
      iso3: 'CAN',
      phoneCode: '1',
      currency: 'CAD',
      capital: 'Ottawa',
      region: 'Americas',
      subregion: 'Northern America',
      emoji: '🇨🇦',
      latitude: 56.1,
      longitude: -106.3,
    } as Country;

    const state = {
      id: 'state-1',
      countryId: 'country-1',
      name: 'Ontario',
      iso2: 'ON',
      type: 'province',
      latitude: 51.2,
      longitude: -85.3,
    } as State;

    const city = {
      id: 'city-1',
      stateId: 'state-1',
      countryId: 'country-1',
      name: 'Toronto',
      latitude: 43.7,
      longitude: -79.4,
    } as City;

    expect(toCountryResponse(country)).toMatchObject({
      id: 'country-1',
      iso2: 'CA',
      name: 'Canada',
    });
    expect(toStateResponse(state)).toMatchObject({
      id: 'state-1',
      countryId: 'country-1',
      name: 'Ontario',
    });
    expect(toCityResponse(city)).toMatchObject({
      id: 'city-1',
      stateId: 'state-1',
      name: 'Toronto',
    });
  });
});
