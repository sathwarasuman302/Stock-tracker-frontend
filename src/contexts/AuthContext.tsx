import {
	createContext,
	useCallback,
	useReducer,
	type Dispatch,
	type FC,
	type ReactNode,
} from "react";
import {
	clearAuthSession,
	ensureDefaultAdmin,
	getAuthSession,
	saveAuthSession,
	type UserRole,
} from "../utils/authStorage";

export type User = {
	first_name?: string;
	last_name?: string;
	email?: string;
	avatarUrl?: string;
	role?: UserRole;
} | null;

export type AuthState = {
	isAuthenticated: boolean;
	user: User;
};

export const ActionTypes = {
	LOGIN: "LOGIN",
	LOGOUT: "LOGOUT",
} as const;

type ActionType =
	(typeof ActionTypes)[keyof typeof ActionTypes];

type AuthAction = {
	type: ActionType;
	payload: Record<string, unknown>;
};

type AuthContextValue = {
	state: AuthState;
	authDispatch: Dispatch<AuthAction>;
	ActionTypes: typeof ActionTypes;
};

const initialState: AuthState = {
	isAuthenticated: false,
	user: null,
};

function readPersistedState(): AuthState {
	const user = getAuthSession();
	if (!user) {
		return initialState;
	}
	return {
		isAuthenticated: true,
		user,
	};
}

function authReducer(
	state: AuthState,
	action: AuthAction
): AuthState {
	switch (action.type) {
		case ActionTypes.LOGIN:
			return {
				isAuthenticated: true,
				user: (action.payload.user as User) ?? null,
			};
		case ActionTypes.LOGOUT:
			return {
				isAuthenticated: false,
				user: null,
			};
		default:
			return state;
	}
}

export const AuthContext = createContext<AuthContextValue>({
	state: initialState,
	authDispatch: () => undefined,
	ActionTypes,
});

export const AuthProvider: FC<{ children: ReactNode }> = ({
	children,
}) => {
	ensureDefaultAdmin();
	const [state, dispatch] = useReducer(
		authReducer,
		undefined,
		readPersistedState
	);

	const authDispatch: Dispatch<AuthAction> = useCallback(
		(action) => {
			if (action.type === ActionTypes.LOGIN) {
				const user = (action.payload.user as User) ?? null;
				saveAuthSession(user);
			} else if (action.type === ActionTypes.LOGOUT) {
				clearAuthSession();
			}
			dispatch(action);
		},
		[]
	);

	return (
		<AuthContext.Provider
			value={{ state, authDispatch, ActionTypes }}
		>
			{children}
		</AuthContext.Provider>
	);
};
