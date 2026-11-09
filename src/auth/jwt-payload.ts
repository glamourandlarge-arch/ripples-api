export type JwtPayload = {
  sub: string;
  email: string | null;
  jti: string;
  sv: number;
  iat?: number;
  exp?: number;
};
