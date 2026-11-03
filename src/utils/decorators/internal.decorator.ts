import { SetMetadata } from '@nestjs/common';

export const INTERNAL_ROUTE = 'ripples:internal-route';

export const Internal = () => SetMetadata(INTERNAL_ROUTE, true);
