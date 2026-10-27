import { useContext, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import type { UserRole } from "../utils/authStorage";

function RequireRole({
	roles,
	children,
}: {
	roles: UserRole[];
	children: ReactNode;
}) {
	const { state } = useContext(AuthContext);

	if (!state.isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	const role = state.user?.role;
	if (!role || !roles.includes(role)) {
		return <Navigate to="/" replace />;
	}

	return children;
}

export default RequireRole;
