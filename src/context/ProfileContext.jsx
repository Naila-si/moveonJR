import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "app.profile.v1";

const defaultProfile = {
  name: "Admin",
  title: "Admin Sistem",
  email: "",
  phone: "",
  bio: "",
  avatarUrl: "", // base64/file url
};

const ProfileCtx = createContext({
  profile: defaultProfile,
  updateProfile: () => {},
  resetProfile: () => {},
});

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const api = useMemo(
    () => ({
      profile,
      updateProfile: (patch) =>
        setProfile((p) => ({ ...p, ...patch })),
      resetProfile: () => setProfile(defaultProfile),
    }),
    [profile]
  );

  return <ProfileCtx.Provider value={api}>{children}</ProfileCtx.Provider>;
}

export function useProfile() {
  return useContext(ProfileCtx);
}

// helper: inisial dari nama
export function initialsFrom(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "AD";
}
