import type { NextAuthConfig } from "next-auth";
import { NO_ACCESS_PATH, canAccessPath } from "@/lib/route-access";

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

      if (pathname === "/login" || pathname === "/") {
        return true;
      }

      if (!user) {
        const loginUrl = new URL("/login", nextUrl);
        if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }

      // Bouncing silently to the dashboard reads as a broken link. Send them
      // somewhere that names what was refused instead, carrying the path so the
      // page can say which section it was.
      if (
        pathname !== NO_ACCESS_PATH &&
        !canAccessPath(pathname, user.permissions ?? [])
      ) {
        const noAccess = new URL(NO_ACCESS_PATH, nextUrl);
        noAccess.searchParams.set("from", pathname);
        return Response.redirect(noAccess);
      }

      return true;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
