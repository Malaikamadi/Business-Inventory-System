import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
        token.roleId = user.roleId;
        token.permissions = user.permissions;
        token.shopIds = user.shopIds;
        token.primaryShopId = user.primaryShopId;
        token.isOwner = user.isOwner;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        emailVerified: null,
        firstName: token.firstName,
        lastName: token.lastName,
        role: token.role,
        roleId: token.roleId,
        permissions: token.permissions,
        shopIds: token.shopIds,
        primaryShopId: token.primaryShopId,
        isOwner: token.isOwner,
      } as any;
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnApi = nextUrl.pathname.startsWith("/api");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (!isOnApi && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
