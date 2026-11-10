import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { RegionsSeedService } from '../regions/regions-seed.service.js';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const seeder = app.get(RegionsSeedService);
    const result = await seeder.seedFromRemoteIfEmpty();
    if (result.skipped) {
      console.log(
        `Regions already present (${result.countries} countries). Nothing to do.`,
      );
    } else {
      console.log(
        `Seeded ${result.countries} countries, ${result.states} states, ${result.cities} cities.`,
      );
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
