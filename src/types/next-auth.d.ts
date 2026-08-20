import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    roleId: string;
    permissions: string[];
    shopIds: string[];
    primaryShopId: string | null;
    isOwner: boolean;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    roleId: string;
    permissions: string[];
    shopIds: string[];
    primaryShopId: string | null;
    isOwner: boolean;
  }
}
