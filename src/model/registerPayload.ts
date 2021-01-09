import { SocialProviderCreateWithoutUserInput } from "@prisma/client";

export type JwtRegisterPayload = SocialProviderCreateWithoutUserInput;
export type JwtForgotPassPayload = { email: string };