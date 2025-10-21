import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const SESSION_KEY = "session";

export default function ProtectedRoute({ allowEmails }) {
  const loc = useLocation();
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch {}

  if (!session) return <Navigate to="/login" replace state={{ from: loc }} />;

  const email = (session.email || "").toLowerCase();
  if (Array.isArray(allowEmails) && !allowEmails.includes(email)) {
    if (email === "esga@gmail.com") return <Navigate to="/dashboard/esga" replace />;
    if (email === "dumaigo@gmail.com") return <Navigate to="/dashboard/dumai" replace />;
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
