import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'ripples:public-route';

export const Public = () => SetMetadata(IS_PUBLIC, true);
