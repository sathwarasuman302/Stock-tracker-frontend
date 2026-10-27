export type UserRole = "investor" | "trader" | "admin";

export type SessionUser = {
	first_name?: string;
	last_name?: string;
	email?: string;
	avatarUrl?: string;
	role?: UserRole;
} | null;

export type RegisteredUser = {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	role: UserRole;
	avatarUrl?: string;
	createdAt?: number;
};

const STORAGE_KEY = "stock-tracker-users";
const SESSION_KEY = "stock-tracker-session";

export const DEFAULT_ADMIN_EMAIL = "admin@stocktracker.com";
export const DEFAULT_ADMIN_PASSWORD = "Admin@123";

export const getRegisteredUsers = (): RegisteredUser[] => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as RegisteredUser[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const writeUsers = (users: RegisteredUser[]) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

export const saveRegisteredUser = (user: RegisteredUser) => {
	const existingUsers = getRegisteredUsers();
	const nextUsers = [
		...existingUsers.filter(
			(entry) => entry.email.toLowerCase() !== user.email.toLowerCase()
		),
		user,
	];
	writeUsers(nextUsers);
};

export const deleteRegisteredUser = (email: string) => {
	writeUsers(
		getRegisteredUsers().filter(
			(user) => user.email.toLowerCase() !== email.toLowerCase()
		)
	);
};

export const findRegisteredUser = (email: string, password: string) => {
	return getRegisteredUsers().find(
		(user) =>
			user.email.toLowerCase() === email.toLowerCase() &&
			user.password === password
	);
};

export const ensureDefaultAdmin = () => {
	const users = getRegisteredUsers();
	const hasAdmin = users.some((user) => user.role === "admin");
	if (hasAdmin) return;

	saveRegisteredUser({
		first_name: "Site",
		last_name: "Admin",
		email: DEFAULT_ADMIN_EMAIL,
		password: DEFAULT_ADMIN_PASSWORD,
		role: "admin",
	});
};

export const getAuthSession = (): SessionUser => {
	try {
		const raw = sessionStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as SessionUser;
		if (!parsed || typeof parsed !== "object") return null;
		return parsed;
	} catch {
		return null;
	}
};

export const saveAuthSession = (user: SessionUser) => {
	if (!user) return;
	sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
	sessionStorage.removeItem(SESSION_KEY);
};
