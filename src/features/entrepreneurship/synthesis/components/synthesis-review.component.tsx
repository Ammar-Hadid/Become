"use client";

import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { AiGeneratedText } from "@/components/ui/ai-generated-text/ai-generated-text.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowUpRight,
  Bot,
  Check,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  acceptSynthesisAction,
  discardSynthesisAction,
  generateSynthesisAction,
  getSynthesisRunStatusAction,
} from "@/features/entrepreneurship/synthesis/actions/synthesis.action";
import type {
  SynthesisOutput,
  SynthesisWorkspace,
} from "@/features/entrepreneurship/synthesis/types/synthesis.types";

const kindLabel: Record<SynthesisOutput["findings"][number]["kind"], string> = {
  FACT: "Fact",
  INTERPRETATION: "Interpretation",
  HYPOTHESIS: "Hypothesis",
  QUESTION: "Question",
  DECISION: "Decision",
  CONTRADICTION: "Contradiction",
};

const findingKinds = Object.keys(kindLabel) as Array<
  SynthesisOutput["findings"][number]["kind"]
>;
const laneLabel: Record<SynthesisOutput["findings"][number]["lane"], string> = {
  B2C: "Consumers",
  B2B: "Businesses",
  CROSS_MARKET: "Cross-market",
};

function isUncertaintyKind(kind: SynthesisOutput["findings"][number]["kind"]) {
  return kind === "QUESTION" || kind === "HYPOTHESIS";
}

export function SynthesisReview({
  nicheId,
  workspace,
  archived = false,
}: {
  nicheId: string;
  workspace: SynthesisWorkspace;
  archived?: boolean;
}) {
  const router = useRouter();
  const sound = useInterfaceSound();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [acceptedNow, setAcceptedNow] = useState(false);
  const [draft, setDraft] = useState(workspace.proposal?.output ?? null);
  const [originIds, setOriginIds] = useState(
    () =>
      workspace.proposal?.output?.findings.map((finding) => finding.claimId) ??
      [],
  );
  const operationKey = useRef<string | null>(null);
  const proposal = workspace.proposal;

  function generate(newAttempt = false) {
    setFeedback(null);
    startTransition(async () => {
      if (newAttempt || !operationKey.current)
        operationKey.current = crypto.randomUUID();
      try {
        const result = await generateSynthesisAction(
          nicheId,
          operationKey.current,
        );
        operationKey.current = null;
        setFeedback(result.error ?? result.success ?? null);
        if (!result.error) router.refresh();
      } catch {
        setFeedback(
          "The request was interrupted. Retry to check the same attempt.",
        );
      }
    });
  }

  function discard() {
    if (!proposal) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await discardSynthesisAction(nicheId, proposal.id);
      setFeedback(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  function accept() {
    if (!proposal || !draft) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await acceptSynthesisAction(nicheId, proposal.id, draft);
      setFeedback(result.error ?? result.success ?? null);
      if (result.error) sound.play("actionBlocked");
      if (!result.error) {
        sound.play("saveConfirmed");
        if (result.id) {
          try {
            window.sessionStorage.setItem(
              `become:synthesis-accepted:${nicheId}`,
              result.id,
            );
          } catch {
            // The accepted edition still refreshes when storage is unavailable.
          }
        }
        router.refresh();
      }
    });
  }

  function refreshStatus() {
    if (!proposal) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await getSynthesisRunStatusAction(nicheId, proposal.id);
        if (!result) {
          setFeedback("Sign in again to check this proposal.");
          return;
        }
        if (result.status !== "PENDING") router.refresh();
        else setFeedback("The proposal is still being prepared.");
      } catch {
        setFeedback("Could not check progress. Try checking again.");
      }
    });
  }

  const canGenerate = workspace.configured && workspace.credentialAvailable;
  const sources =
    proposal?.context.sources ?? workspace.latest?.context.sources ?? [];
  const reviewing = proposal?.status === "READY" && Boolean(draft);
  const draftValid = Boolean(
    draft &&
    draft.title.trim() &&
    draft.summary.trim() &&
    draft.findings.every((finding) => finding.statement.trim()) &&
    draft.nextQuestions.every((question) => question.trim()),
  );

  useEffect(() => {
    if (!proposal || proposal.status !== "PENDING") return;
    let active = true;
    let checking = false;
    let timer = 0;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const result = await getSynthesisRunStatusAction(nicheId, proposal.id);
        if (!active) return;
        if (!result) {
          window.clearInterval(timer);
          setFeedback("Sign in again to check this proposal.");
        } else if (result.status !== "PENDING") {
          window.clearInterval(timer);
          router.refresh();
        }
      } catch {
        if (active)
          setFeedback("Could not check progress. Try checking again.");
      } finally {
        checking = false;
      }
    };
    timer = window.setInterval(check, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [nicheId, proposal, router]);

  useEffect(() => {
    const editionId = workspace.latest?.editionId;
    if (!editionId) return;
    const key = `become:synthesis-accepted:${nicheId}`;
    try {
      if (window.sessionStorage.getItem(key) !== editionId) return;
      window.sessionStorage.removeItem(key);
      const frame = window.requestAnimationFrame(() => setAcceptedNow(true));
      return () => window.cancelAnimationFrame(frame);
    } catch {
      // Storage is an enhancement for one-time confirmation only.
    }
  }, [nicheId, workspace.latest?.editionId]);

  return (
    <Card className="synthesis-review" aria-labelledby="synthesis-title">
      <header className="synthesis-review-heading">
        <div className="synthesis-review-mark" aria-hidden="true">
          <Bot />
        </div>
        <div>
          <div className="synthesis-review-label">
            <span>Nexo</span>
            <span>{reviewing ? "Proposal" : "Synthesis"}</span>
          </div>
          <h3 id="synthesis-title">
            {reviewing ? "Review synthesis" : "Let Nexo connect the evidence"}
          </h3>
          <p>
            {reviewing
              ? "Edit the proposal, then choose what becomes accepted understanding."
              : "Nexo drafts from your recorded sources. You decide what to keep."}
          </p>
        </div>
        {!proposal && !archived && canGenerate && (
          <Button
            variant="primary"

            type="button"
            onClick={() => generate()}
            disabled={pending || !canGenerate}
          >
            {pending ? (
              <RefreshCw aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {workspace.latest ? "Refresh proposal" : "Draft synthesis"}
          </Button>
        )}
      </header>

      {!proposal &&
      !workspace.latest &&
      (!workspace.configured || !workspace.credentialAvailable) ? (
        <details className="synthesis-setup">
          <summary>Nexo needs setup</summary>
          <div role="note">
            <p>
              {!workspace.configured
                ? "Choose a model for synthesis before asking Nexo to draft."
                : "The server credential for Nexo is unavailable."}
            </p>
            <Link href="/settings/nexo">
              Open Nexo settings <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </details>
      ) : proposal?.status === "PENDING" || (pending && !draft) ? (
        <div className="synthesis-pending" role="status">
          <span aria-hidden="true" />
          <div>
            <strong>Nexo is reading the bounded source set.</strong>
            <p>
              Your accepted edition stays unchanged while the proposal is
              prepared.
            </p>
          </div>
          <Button
            variant="secondary"
            type="button"

            onClick={refreshStatus}
            disabled={pending}
          >
            <RefreshCw aria-hidden="true" /> Check status
          </Button>
        </div>
      ) : proposal?.status === "FAILED" ? (
        <div className="synthesis-failed" role="alert">
          <div>
            <strong>The proposal did not finish.</strong>
            <p>
              {proposal.error ?? "Generate a new proposal when you are ready."}
            </p>
          </div>
          {!archived && (
            <Button
              variant="secondary"
              type="button"

              onClick={() => generate(true)}
              disabled={pending}
            >
              <RefreshCw aria-hidden="true" /> Retry
            </Button>
          )}
        </div>
      ) : proposal?.status === "READY" && draft ? (
        <div className="synthesis-proposal">
          <div className="synthesis-proposal-toolbar">
            <span>
              {proposal.context.coverage.includedSources} of{" "}
              {proposal.context.coverage.eligibleSources} eligible sources
              included
            </span>
            {!archived && (
              <div className="business-actions">
                <Button
                  variant="secondary"
                  type="button"

                  onClick={discard}
                  disabled={pending}
                >
                  <Trash2 aria-hidden="true" /> Discard
                </Button>
                <Button
                  variant="primary"
                  type="button"

                  onClick={accept}
                  disabled={pending || !draftValid}
                >
                  <Check aria-hidden="true" /> Accept edition
                </Button>
              </div>
            )}
          </div>
          <label className="synthesis-field">
            <span>Title</span>
            <Input
              readOnly={archived || pending}
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
          </label>
          <label className="synthesis-field">
            <span>Summary</span>
            <Textarea
              readOnly={archived || pending}
              rows={5}
              value={draft.summary}
              onChange={(event) =>
                setDraft({ ...draft, summary: event.target.value })
              }
            />
          </label>
          <div className="synthesis-findings">
            <header>
              <div>
                <p className="eyebrow">Proposed findings</p>
                <h4>
                  {draft.findings.length}{" "}
                  {draft.findings.length === 1 ? "claim" : "claims"} to review
                </h4>
              </div>
            </header>
            {draft.findings.map((finding, index) => {
              const originId = originIds[index] ?? finding.claimId;
              const original = originId
                ? proposal.context.understanding.find(
                    (item) => item.id === originId,
                  )
                : null;
              return (
                <article
                  key={`${originId ?? "new"}-${index}`}
                  className="synthesis-finding"
                >
                  <div className="synthesis-finding-meta">
                    <span>{finding.claimId ? "Updates finding" : "New"}</span>
                    <span data-kind={finding.kind.toLowerCase()}>
                      {kindLabel[finding.kind]}
                    </span>
                    <span>{laneLabel[finding.lane]}</span>
                  </div>
                  <div className="synthesis-finding-copy">
                    <label className="synthesis-field">
                      <span className="sr-only">Finding {index + 1}</span>
                      <Textarea
                        readOnly={archived || pending}
                        rows={3}
                        value={finding.statement}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            findings: draft.findings.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, statement: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                    {original && (
                      <p className="synthesis-original-statement">
                        <span>Original captured wording</span>
                        {original.statement}
                      </p>
                    )}
                  </div>
                  <details className="synthesis-sources">
                    <summary>
                      Classification and {finding.sourceKeys.length} cited{" "}
                      {finding.sourceKeys.length === 1 ? "source" : "sources"}
                    </summary>
                    <div className="synthesis-finding-settings">
                      <label>
                        <span>Kind</span>
                        <NativeSelect
                          disabled={archived || pending}
                          value={finding.kind}
                          onChange={(event) => {
                            const kind = event.target
                              .value as typeof finding.kind;
                            setDraft({
                              ...draft,
                              findings: draft.findings.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      kind,
                                      claimId:
                                        isUncertaintyKind(item.kind) ===
                                        isUncertaintyKind(kind)
                                          ? item.claimId
                                          : null,
                                    }
                                  : item,
                              ),
                            });
                          }}
                        >
                          {findingKinds.map((kind) => (
                            <option key={kind} value={kind}>
                              {kindLabel[kind]}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                      <label>
                        <span>Audience</span>
                        <NativeSelect
                          disabled={archived || pending}
                          value={finding.lane}
                          onChange={(event) => {
                            const lane = event.target
                              .value as typeof finding.lane;
                            setDraft({
                              ...draft,
                              findings: draft.findings.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, lane } : item,
                              ),
                            });
                          }}
                        >
                          {Object.entries(laneLabel).map(([lane, label]) => (
                            <option key={lane} value={lane}>
                              {label}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                      {!archived && !pending && (
                        <Button
                          variant="secondary"
                          type="button"

                          onClick={() => {
                            setDraft({
                              ...draft,
                              findings: draft.findings.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            });
                            setOriginIds((items) =>
                              items.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            );
                          }}
                        >
                          <Trash2 aria-hidden="true" /> Remove finding
                        </Button>
                      )}
                    </div>
                    <div className="synthesis-source-list">
                      {sources.map((source) => {
                        const checked = finding.sourceKeys.includes(source.key);
                        return (
                          <label key={source.key}>
                            <input
                              type="checkbox"
                              disabled={archived || pending}
                              checked={checked}
                              onChange={() =>
                                setDraft({
                                  ...draft,
                                  findings: draft.findings.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            sourceKeys: checked
                                              ? item.sourceKeys.filter(
                                                  (key) => key !== source.key,
                                                )
                                              : [
                                                  ...item.sourceKeys,
                                                  source.key,
                                                ],
                                          }
                                        : item,
                                  ),
                                })
                              }
                            />
                            <span>
                              <strong>{source.label}</strong>
                              <small>{source.excerpt}</small>
                            </span>
                            <Link
                              href={source.href}
                              target="_blank"
                              aria-label={`Open source: ${source.label}`}
                            >
                              <ArrowUpRight aria-hidden="true" />
                            </Link>
                          </label>
                        );
                      })}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
          <div className="synthesis-questions synthesis-question-editor">
            <header>
              <p className="eyebrow">Questions left open</p>
              {!archived && !pending && draft.nextQuestions.length < 8 && (
                <Button
                  variant="secondary"
                  type="button"

                  onClick={() =>
                    setDraft({
                      ...draft,
                      nextQuestions: [...draft.nextQuestions, ""],
                    })
                  }
                >
                  <Plus aria-hidden="true" /> Add question
                </Button>
              )}
            </header>
            {draft.nextQuestions.map((question, index) => (
              <div key={index} className="synthesis-question-row">
                <label className="synthesis-field">
                  <span className="sr-only">Question {index + 1}</span>
                  <Textarea
                    readOnly={archived || pending}
                    rows={2}
                    value={question}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        nextQuestions: draft.nextQuestions.map(
                          (item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                        ),
                      })
                    }
                  />
                </label>
                {!archived && !pending && (
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"

                    aria-label={`Remove question ${index + 1}`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        nextQuestions: draft.nextQuestions.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      })
                    }
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <details className="synthesis-limitations">
            <summary>Coverage and limitations</summary>
            <label className="synthesis-field">
              <span>Limitations</span>
              <Textarea
                readOnly={archived || pending}
                rows={3}
                value={draft.limitations}
                onChange={(event) =>
                  setDraft({ ...draft, limitations: event.target.value })
                }
              />
            </label>
            <p>
              {proposal.context.coverage.omittedSources} eligible sources were
              outside this bounded run.
            </p>
            {proposal.context.coverage.omittedUnderstanding > 0 && (
              <p>
                {proposal.context.coverage.omittedUnderstanding} existing
                findings were outside the bounded context and remain unchanged.
              </p>
            )}
          </details>
        </div>
      ) : workspace.latest ? (
        <div
          className="synthesis-accepted"
          data-accepted-now={acceptedNow || undefined}
        >
          {acceptedNow && (
            <p className="synthesis-accepted-confirmation" role="status">
              <Check aria-hidden="true" /> Edition accepted
            </p>
          )}
          <div className="synthesis-accepted-copy">
            <div className="synthesis-review-label">
              <span>Edition {workspace.latest.number}</span>
              <time dateTime={workspace.latest.publishedAt}>
                {new Date(workspace.latest.publishedAt).toLocaleDateString()}
              </time>
              {workspace.refreshRecommended && (
                <span data-tone="attention">Refresh recommended</span>
              )}
            </div>
            <h4>{workspace.latest.output.title}</h4>
            <AiGeneratedText
              text={workspace.latest.output.summary}
              staticText={!acceptedNow}
            />
          </div>
          <div className="synthesis-accepted-findings">
            {workspace.latest.output.findings.map((finding, index) => (
              <article key={`${finding.claimId ?? "accepted"}-${index}`}>
                <div className="synthesis-finding-meta">
                  <span>{kindLabel[finding.kind]}</span>
                  <span>
                    {finding.lane === "B2C"
                      ? "Consumers"
                      : finding.lane === "B2B"
                        ? "Businesses"
                        : "Cross-market"}
                  </span>
                </div>
                <p>{finding.statement}</p>
              </article>
            ))}
          </div>
          <details className="synthesis-sources synthesis-sources--accepted">
            <summary>
              Inspect {workspace.latest.context.sources.length} frozen sources
            </summary>
            <div className="synthesis-source-list">
              {workspace.latest.context.sources.map((source) => (
                <Link key={source.key} href={source.href}>
                  <span>
                    <strong>{source.label}</strong>
                    <small>{source.excerpt}</small>
                  </span>
                  <span
                    className="synthesis-source-state"
                    data-state={
                      workspace.latest!.sourceStates[source.key] ??
                      "unavailable"
                    }
                  >
                    {workspace.latest!.sourceStates[source.key] ??
                      "unavailable"}
                  </span>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </details>
          <details className="synthesis-limitations">
            <summary>Coverage and limitations</summary>
            <p>
              {workspace.latest.output.limitations ||
                "No limitations were supplied."}
            </p>
            <p>
              {workspace.latest.context.coverage.includedSources} of{" "}
              {workspace.latest.context.coverage.eligibleSources} eligible
              sources informed this edition.
            </p>
            {workspace.latest.context.coverage.omittedUnderstanding > 0 && (
              <p>
                {workspace.latest.context.coverage.omittedUnderstanding}{" "}
                existing findings were outside the bounded context and remained
                unchanged.
              </p>
            )}
          </details>
          {!canGenerate && !archived && (
            <details className="synthesis-setup">
              <summary>Set up Nexo to refresh this edition</summary>
              <div>
                <p>
                  {!workspace.configured
                    ? "Choose a model for synthesis."
                    : "The server credential for Nexo is unavailable."}
                </p>
                <Link href="/settings/nexo">
                  Open Nexo settings <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>
            </details>
          )}
        </div>
      ) : (
        <div className="synthesis-empty">
          <p>
            No accepted synthesis yet. Your manual findings below remain the
            source of truth.
          </p>
          {workspace.unpublishedChanges && (
            <span>There is recorded material ready to synthesize.</span>
          )}
        </div>
      )}
      {feedback && (
        <p className="synthesis-feedback" role="status">
          {feedback}
        </p>
      )}
    </Card>
  );
}
