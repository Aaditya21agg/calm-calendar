import NextAuth from "next-auth";
import { prisma } from "@/app/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope:
                      "openid email profile https://www.googleapis.com/auth/calendar",
                },
            },
        }),

    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                (token as any).accessToken = account.access_token;
                (token as any).refreshToken = account.refresh_token;
            }
            return token;
        },

        async session({ session, token }) {
            (session as any).accessToken = (token as any).accessToken;
            (session as any).refreshToken = (token as any).refreshToken;
            return session;
        },
        async signIn({ user, account }) {
            let existingUser = await prisma.user.findUnique({
                where: { email: user.email! },
            });
            if (!existingUser) {
                const trialEnd = new Date();
                trialEnd.setDate(trialEnd.getDate()+7);

                existingUser = await prisma.user.create({
                    data: {
                        email:user.email!,
                        trialEndsAt: trialEnd,
                    },
                });
            }

            if (account?.access_token && account?.refresh_token && user.email) {
                await prisma.googleAccount.upsert({
                    where: {
                        userId_email: {
                            userId: existingUser.id,
                            email: user.email,
                        },
                    },
                    create: {
                        email: user.email,
                        accessToken: account.access_token,
                        refreshToken: account.refresh_token,
                        userId: existingUser.id,
                    },
                    update: {
                        accessToken: account.access_token,
                        refreshToken: account.refresh_token,
                    },
                });
            }

            return true;
        }
    },

};
const handler = NextAuth(authOptions);
export {handler as GET , handler as POST};
