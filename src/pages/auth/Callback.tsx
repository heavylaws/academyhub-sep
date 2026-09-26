import { Navigate } from "react-router-dom";

// Email/password sign-in has no redirect step; kept so old links still land home.
export default function AuthCallback() {
  return <Navigate to="/" replace />;
}
