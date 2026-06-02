import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

