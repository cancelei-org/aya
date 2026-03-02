import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { isEmailAllowed } from '@/lib/formspree';

export const authOptions: NextAuthOptions = {
  // PrismaAdapterを有効化してユーザー情報をDBに自動保存
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Email Login',
      credentials: {
        email: {
          label: 'Email Address',
          type: 'email',
          placeholder: 'Enter your email address',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        try {
          // Formspreeウェイティングリストをチェック
          const isAllowed = await isEmailAllowed(credentials.email);

          if (!isAllowed) {
            throw new Error('WAITLIST_REQUIRED');
          }

          // ユーザーをDBから取得または作成
          const user = await prisma.user.upsert({
            where: { email: credentials.email },
            update: {
              lastActiveAt: new Date(),
            },
            create: {
              email: credentials.email,
              name: credentials.email.split('@')[0],
              chatCount: 0,
              isPremium: false,
              isAdmin: false,
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error('NextAuth authorize error:', error);
          // In development mode or if Formspree fails, allow login
          if (
            process.env.NODE_ENV === 'development' ||
            (error as Error).message !== 'WAITLIST_REQUIRED'
          ) {
            console.log('Allowing login due to development mode or API error');

            // 開発環境でもDBにユーザーを作成
            const user = await prisma.user.upsert({
              where: { email: credentials.email },
              update: {
                lastActiveAt: new Date(),
              },
              create: {
                email: credentials.email,
                name: credentials.email.split('@')[0],
                chatCount: 0,
                isPremium: false,
                isAdmin: false,
              },
            });

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            };
          }

          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user?.email) {
        // DBから最新のユーザー情報を取得
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            isPremium: true,
            isAdmin: true,
            chatCount: true,
          },
        });

        if (dbUser) {
          session.user = {
            ...session.user,
            ...dbUser,
          };
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
