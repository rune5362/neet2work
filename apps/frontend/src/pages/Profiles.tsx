import { useEffect } from "react";

export function Profiles() {
  useEffect(() => {
    window.location.replace("/documents?type=profile");
  }, []);

  return null;
}
