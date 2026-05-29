import { useEffect } from "react";

export function ProfileVersions() {
  useEffect(() => {
    window.location.replace("/documents?type=profile");
  }, []);

  return null;
}
