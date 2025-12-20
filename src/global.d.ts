/// <reference types="@clerk/express/env" />

export {};

export type Role = "admin" | "user";

declare global {
	interface CustomJwtSessionClaims {
		metadata: {
			role?: Role;
		};
	}
}

