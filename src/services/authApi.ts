import type { UserRole } from "../utils/authStorage";

export type AuthUser = {
	first_name: string;
	last_name: string;
	email: string;
	role: UserRole;
	avatarUrl?: string;
};

type AuthResponse = { user: AuthUser; error?: string };

const resolveApiUrl = () => {
	const configured = import.meta.env.VITE_MARKET_API_URL as string | undefined;
	return configured?.trim() ? configured : "/api";
};

const postAuthRequest = async (
	path: string,
	body: Record<string, string>
): Promise<AuthUser> => {
	let response: Response;
	try {
		response = await fetch(`${resolveApiUrl()}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	} catch {
		throw new Error("Cannot connect to the account service. Check that the backend is running.");
	}

	const payload = (await response.json().catch(() => ({}))) as AuthResponse;
	if (!response.ok) {
		throw new Error(payload.error ?? "The account request could not be completed.");
	}
	return payload.user;
};

export const registerAccount = (user: {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	role: Exclude<UserRole, "admin">;
	avatarUrl?: string;
}): Promise<AuthUser> => postAuthRequest("/auth/register", user);

export const updateProfileAvatar = (avatarUrl: string): Promise<AuthUser> =>
	postAuthRequest("/auth/avatar", { avatarUrl });

export const loginAccount = (email: string, password: string): Promise<AuthUser> =>
	postAuthRequest("/auth/login", { email, password });
