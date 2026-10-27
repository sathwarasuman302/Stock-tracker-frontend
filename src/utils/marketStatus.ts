export type MarketSession = {
	id: string;
	timeZone: string;
	openMinutes: number;
	closeMinutes: number;
};

const WEEKDAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

const getZonedParts = (timeZone: string, date: Date) => {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);

	const read = (type: string) =>
		parts.find((part) => part.type === type)?.value ?? "";

	return {
		weekday: read("weekday"),
		hour: Number(read("hour")),
		minute: Number(read("minute")),
	};
};

export const isMarketOpen = (session: MarketSession, date = new Date()) => {
	const { weekday, hour, minute } = getZonedParts(session.timeZone, date);
	if (!WEEKDAYS.has(weekday)) return false;
	const nowMinutes = hour * 60 + minute;
	return nowMinutes >= session.openMinutes && nowMinutes < session.closeMinutes;
};

export const formatSessionHours = (session: MarketSession) => {
	const toClock = (total: number) => {
		const hour = Math.floor(total / 60);
		const minute = String(total % 60).padStart(2, "0");
		return `${hour}:${minute}`;
	};
	return `${toClock(session.openMinutes)}–${toClock(session.closeMinutes)}`;
};

export const marketSessions: Record<string, MarketSession> = {
	nse: {
		id: "nse",
		timeZone: "Asia/Kolkata",
		openMinutes: 9 * 60 + 15,
		closeMinutes: 15 * 60 + 30,
	},
	bse: {
		id: "bse",
		timeZone: "Asia/Kolkata",
		openMinutes: 9 * 60 + 15,
		closeMinutes: 15 * 60 + 30,
	},
	nasdaq: {
		id: "nasdaq",
		timeZone: "America/New_York",
		openMinutes: 9 * 60 + 30,
		closeMinutes: 16 * 60,
	},
};
