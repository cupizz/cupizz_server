import { Prisma } from '@prisma/client';
export type JwtRegisterPayload = Prisma.SocialProviderCreateWithoutUserInput;
export type JwtForgotPassPayload = { email: string };