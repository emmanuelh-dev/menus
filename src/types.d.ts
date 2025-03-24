import type { AuthUser } from './lib/auth';

declare module "astro:middleware" {
  interface Locals {
    user: AuthUser | null;
  }
}
declare namespace App {
	interface Locals {
    user: AuthUser | null;
	}
}