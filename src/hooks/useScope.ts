import { useCallback, useEffect, useState } from "react";

const LS_ORG = "hisabati.scope.org";
const LS_ORG_NAME = "hisabati.scope.orgName";
const LS_BRANCH = "hisabati.scope.branch";
const LS_BRANCH_NAME = "hisabati.scope.branchName";

export interface Scope {
  organizationId: string;
  organizationName: string;
  branchId: string;
  branchName: string;
}

function read(key: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function useScope() {
  const [scope, setScopeState] = useState<Scope>({
    organizationId: "",
    organizationName: "",
    branchId: "",
    branchName: "",
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setScopeState({
      organizationId: read(LS_ORG),
      organizationName: read(LS_ORG_NAME),
      branchId: read(LS_BRANCH),
      branchName: read(LS_BRANCH_NAME),
    });
    setReady(true);
  }, []);

  const setOrganization = useCallback((id: string, name: string) => {
    window.localStorage.setItem(LS_ORG, id);
    window.localStorage.setItem(LS_ORG_NAME, name);
    window.localStorage.removeItem(LS_BRANCH);
    window.localStorage.removeItem(LS_BRANCH_NAME);
    setScopeState({ organizationId: id, organizationName: name, branchId: "", branchName: "" });
  }, []);

  const setBranch = useCallback((id: string, name: string) => {
    window.localStorage.setItem(LS_BRANCH, id);
    window.localStorage.setItem(LS_BRANCH_NAME, name);
    setScopeState((prev) => ({ ...prev, branchId: id, branchName: name }));
  }, []);

  const clearScope = useCallback(() => {
    [LS_ORG, LS_ORG_NAME, LS_BRANCH, LS_BRANCH_NAME].forEach((k) => window.localStorage.removeItem(k));
    setScopeState({ organizationId: "", organizationName: "", branchId: "", branchName: "" });
  }, []);

  return { scope, ready, setOrganization, setBranch, clearScope };
}
