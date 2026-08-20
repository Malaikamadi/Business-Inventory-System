import type { NextAuthConfig } from "next-auth";
import { canAccessPath } from "@/lib/route-access";

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
        ...session.user,
        id: token.id,
        email: token.email,
        firstName: token.firstName,
        lastName: token.lastName,
        role: token.role,
        roleId: token.roleId,
        permissions: token.permissions,
        shopIds: token.shopIds,
        primaryShopId: token.primaryShopId,
        isOwner: token.isOwner,
      };
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const user = auth?.user;
      const { pathname } = nextUrl;

      if (pathname.startsWith("/api")) return true;

      if (pathname === "/login") {
        if (user) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (!user) {
        const loginUrl = new URL("/login", nextUrl);
        if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }

      if (!canAccessPath(pathname, user.permissions ?? [])) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
