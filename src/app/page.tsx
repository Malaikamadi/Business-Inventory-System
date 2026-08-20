import { redirect } from "next/navigation";

/**
 * The first screen is always sign-in so you choose a role instead of landing
 * on whoever was last signed in.
 */
export default function HomePage() {
  redirect("/login");
}
