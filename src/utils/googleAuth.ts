export type GoogleUser = {
	email: string;
	first_name: string;
	last_name?: string;
	role?: "investor" | "trader";
};

type JwtPayload = {
	email?: string;
	given_name?: string;
	family_name?: string;
	name?: string;
};

const decodeJwtPayload = (credential: string): JwtPayload => {
	try {
		const [, payload] = credential.split(".");
		if (!payload) return {};
		const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = normalized.padEnd(
			Math.ceil(normalized.length / 4) * 4,
			"="
		);
		const decoded = atob(padded);
		return JSON.parse(decoded) as JwtPayload;
	} catch {
		return {};
	}
};

const loadGoogleScript = () => {
	return new Promise<void>((resolve, reject) => {
		if (window.google?.accounts?.id) {
			resolve();
			return;
		}

		const existingScript = document.querySelector<HTMLScriptElement>(
			'script[src="https://accounts.google.com/gsi/client"]'
		);

		if (existingScript) {
			existingScript.addEventListener("load", () => resolve(), {
				once: true,
			});
			existingScript.addEventListener("error", () => reject(new Error("Google script failed to load.")), {
				once: true,
			});
			return;
		}

		const script = document.createElement("script");
		script.src = "https://accounts.google.com/gsi/client";
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("Google script failed to load."));
		document.head.appendChild(script);
	});
};

export const signInWithGoogle = async (
	onSuccess: (user: GoogleUser) => void
) => {
	const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

	if (!clientId) {
		window.alert("Google login is not configured. Add VITE_GOOGLE_CLIENT_ID to your environment.");
		return;
	}

	try {
		await loadGoogleScript();
	} catch (error) {
		console.error(error);
		window.alert("Google login is unavailable right now. Please try again in a moment.");
		return;
	}

	const google = window.google;
	if (!google?.accounts?.id) {
		window.alert("Google identity services are not available in this browser.");
		return;
	}

	google.accounts.id.initialize({
		client_id: clientId,
		callback: ({ credential }) => {
			if (!credential) {
				return;
			}

			const payload = decodeJwtPayload(credential);
			const fullName = payload.name || "";
			const nameParts = fullName.split(/\s+/).filter(Boolean);
			const firstName =
				payload.given_name || nameParts[0] || "Google";
			const lastName =
				payload.family_name ||
				nameParts.slice(1).join(" ") ||
				"";

			onSuccess({
				email: payload.email || "",
				first_name: firstName,
				last_name: lastName || undefined,
				role: "investor",
			});
		},
	});

	google.accounts.id.prompt((notification) => {
		const promptNotification = notification as
			| {
					isNotDisplayed?: () => boolean;
					isSkippedMoment?: () => boolean;
			  }
			| undefined;

		if (
			promptNotification?.isNotDisplayed?.() ||
			promptNotification?.isSkippedMoment?.()
		) {
			console.warn("Google sign-in prompt was not displayed.", promptNotification);
		}
	});
};
