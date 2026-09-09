"use client";
import { useEffect, useState } from "react";
import { getBusinessSessionOptionsAction } from "@/features/entrepreneurship/sessions/actions/business-session.action";
export function BusinessTimerFields({
  value,
  onChange,
}: {
  value: { businessCompanyId: string; businessNicheId: string };
  onChange: (value: {
    businessCompanyId: string;
    businessNicheId: string;
  }) => void;
}) {
  const [options, setOptions] = useState<{
    companies: { id: string; name: string }[];
    niches: { id: string; name: string }[];
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    getBusinessSessionOptionsAction()
      .then((data) => {
        if (live) setOptions(data);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <details>
      <summary className="text-body text-text-secondary cursor-pointer">
        Company & niche · optional
      </summary>
      <div className="gap-lg pt-lg grid">
        {!options ? (
          <p className="text-meta text-text-muted">
            {failed
              ? "Context could not load. You can still record the session."
              : "Loading context…"}
          </p>
        ) : (
          <>
            <label className="field-label">
              Company
              <select
                className="text-input mt-sm"
                value={value.businessCompanyId}
                onChange={(event) =>
                  onChange({ ...value, businessCompanyId: event.target.value })
                }
              >
                <option value="">No company</option>
                {!options.companies.some(
                  (c) => c.id === value.businessCompanyId,
                ) &&
                  value.businessCompanyId && (
                    <option value={value.businessCompanyId}>
                      Recorded company
                    </option>
                  )}
                {options.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Niche
              <select
                className="text-input mt-sm"
                value={value.businessNicheId}
                onChange={(event) =>
                  onChange({ ...value, businessNicheId: event.target.value })
                }
              >
                <option value="">No niche</option>
                {!options.niches.some((n) => n.id === value.businessNicheId) &&
                  value.businessNicheId && (
                    <option value={value.businessNicheId}>
                      Recorded niche
                    </option>
                  )}
                {options.niches.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
    </details>
  );
}
