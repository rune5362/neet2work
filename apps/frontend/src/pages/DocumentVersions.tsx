import { useEffect } from "react";

function getDocumentIdFromPath() {
  return window.location.pathname.split("/").filter(Boolean)[1] ?? "";
}

export function DocumentVersions() {
  useEffect(() => {
    window.location.replace(`/documents/${getDocumentIdFromPath()}`);
  }, []);

  return null;
}
