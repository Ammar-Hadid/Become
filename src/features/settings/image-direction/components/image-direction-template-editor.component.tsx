"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { Badge, RemovableBadge } from "@/components/ui/badges/badge.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { DocumentEditorGuide } from "@/components/ui/document-editor/components/document-editor-guide.component";
import { DocumentEditorStage } from "@/components/ui/document-editor/components/document-editor-stage.component";
import { getDocumentEditorExtensions } from "@/components/ui/document-editor/config/document-editor.config";
import {
  documentFromText,
  documentToText,
} from "@/components/ui/document-editor/utils/document-editor-text.util";
import { FieldHelp, FieldLabel } from "@/components/ui/forms/field.component";
import { Input } from "@/components/ui/forms/input.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { Tooltip } from "@/components/ui/tooltips/tooltip.component";
import {
  IMAGE_PROMPT_VARIABLES,
  type ImageTemplateAuthoring,
  variablesInPrompt,
} from "@/features/seasons/living/image-direction/schemas/image-template-authoring.schema";

type TemplateVersion = {
  version: number;
  text: string;
  authoring: ImageTemplateAuthoring | null;
};

type TemplateDraft = { text: string; authoring: ImageTemplateAuthoring };

function sameDraft(left: TemplateDraft, right: TemplateDraft | null) {
  return right !== null && left.text === right.text &&
    JSON.stringify(left.authoring) === JSON.stringify(right.authoring);
}

export type ImageDirectionTemplateView = {
  key: string;
  label: string;
  published: TemplateVersion | null;
  draft: TemplateVersion | null;
};

function authoringFor(version: TemplateVersion | null): ImageTemplateAuthoring {
  return (
    version?.authoring ?? {
      intent: "",
      rules: [],
      variables: variablesInPrompt(version?.text ?? ""),
    }
  );
}

export function ImageDirectionTemplateEditor({
  template,
  busy,
  onDirtyChange,
  onPublish,
  onSaveDraft,
}: {
  template: ImageDirectionTemplateView;
  busy: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onPublish: (expectedVersion: number) => Promise<boolean>;
  onSaveDraft: (
    content: { text: string; authoring: ImageTemplateAuthoring },
    expectedVersion: number,
  ) => Promise<boolean>;
}) {
  const saved = template.draft ?? template.published;
  const baseline = useMemo(
    () => ({ version: saved?.version, text: saved?.text ?? "", authoring: authoringFor(saved) }),
    [saved],
  );
  const baselineText = baseline.text;
  const baselineAuthoring = baseline.authoring;
  const [editingIntent, setEditingIntent] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [draftText, setDraftText] = useState(baselineText);
  const [authoring, setAuthoring] = useState(baselineAuthoring);
  const previousBaseline = useRef(baseline);
  const currentDraft = useRef<TemplateDraft>({ text: draftText, authoring });
  const submittedDraft = useRef<TemplateDraft | null>(null);
  const manuscriptRef = useRef<HTMLDivElement>(null);
  const extensions = useMemo(
    () => getDocumentEditorExtensions({ links: false }),
    [],
  );
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: documentFromText(baselineText),
    editorProps: {
      attributes: {
        class: "image-direction-editor-prose document-editor-prose",
        role: "textbox",
        "aria-label": `${template.label} prompt body`,
        "aria-multiline": "true",
        spellcheck: "true",
      },
    },
    onUpdate({ editor: current }) {
      setDraftText(documentToText(current.getJSON()));
    },
  });
  const dirty =
    draftText !== baselineText ||
    JSON.stringify(authoring) !== JSON.stringify(baselineAuthoring);
  const usedVariables = variablesInPrompt(
    [draftText, authoring.intent, ...authoring.rules].join("\n"),
  );
  const allowedVariables = IMAGE_PROMPT_VARIABLES.filter(
    (variable) =>
      template.key.startsWith("scene-") || !("sceneOnly" in variable),
  );
  const addableVariables = allowedVariables.filter(
    (variable) => !authoring.variables.includes(variable.key),
  );
  const saveDraftDisabled =
    busy ||
    !saved ||
    draftText.trim().length < 40 ||
    draftText.length > 12000 ||
    authoring.rules.some((rule) => !rule.trim());
  const saveDraftButton = (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      aria-label="Save as draft"
      disabled={saveDraftDisabled}
      onClick={save}
    >
      <FileText aria-hidden="true" />
    </Button>
  );

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  useLayoutEffect(() => {
    currentDraft.current = { text: draftText, authoring };
  }, [draftText, authoring]);

  useLayoutEffect(() => {
    if (baseline.version === previousBaseline.current.version &&
      sameDraft(baseline, previousBaseline.current)) return;
    // A save/publish response can arrive after the owner has continued writing.
    // Apply normalized saved values only while the local draft is still unchanged.
    if (
      sameDraft(currentDraft.current, previousBaseline.current) ||
      sameDraft(currentDraft.current, submittedDraft.current)
    ) {
      editor?.commands.setContent(documentFromText(baseline.text), { emitUpdate: false });
      setDraftText(baseline.text);
      setAuthoring(baseline.authoring);
      currentDraft.current = baseline;
      setEditingIntent(false);
      setEditingRules(false);
      setEditingPrompt(false);
    }
    previousBaseline.current = baseline;
    submittedDraft.current = null;
  }, [baseline, editor]);

  function discard() {
    editor?.commands.setContent(documentFromText(baselineText), {
      emitUpdate: false,
    });
    setDraftText(baselineText);
    setAuthoring(baselineAuthoring);
    setEditingIntent(false);
    setEditingRules(false);
    setEditingPrompt(false);
  }

  async function save() {
    if (!saved) return;
    submittedDraft.current = { text: draftText, authoring };
    const succeeded = await onSaveDraft(
      { text: draftText, authoring },
      saved.version,
    );
    if (!succeeded) submittedDraft.current = null;
  }

  function updateRule(index: number, value: string) {
    setAuthoring((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? value : rule,
      ),
    }));
  }

  function moveRule(index: number, by: number) {
    setAuthoring((current) => {
      const rules = [...current.rules];
      [rules[index], rules[index + by]] = [rules[index + by], rules[index]];
      return { ...current, rules };
    });
  }

  return (
    <Card
      as="section"
      material="glass"
      spacing="action"
      className="image-direction-template"
      aria-labelledby="image-direction-template-title"
    >
      <header className="image-direction-section-heading">
        <div>
          <p className="type-overline">Saved image direction</p>
          <h3 className="type-widget-title" id="image-direction-template-title">
            Current prompt
          </h3>
          <p className="type-body-sm">{template.label}</p>
        </div>
        <div className="image-direction-heading-actions">
          {template.draft && (
            <Badge variant="specimen-strip" area="direction">
              Draft v{template.draft.version}
            </Badge>
          )}
          {template.published && (
            <Badge variant="specimen-strip" area="direction">
              Published v{template.published.version}
            </Badge>
          )}
          {saveDraftDisabled ? (
            saveDraftButton
          ) : (
            <Tooltip
              content="Save these changes as a draft. Publishing is a separate step."
              area="direction"
              side="bottom"
            >
              {saveDraftButton}
            </Tooltip>
          )}
        </div>
      </header>

      <div className="image-direction-prompt-fields">
        <section className="image-direction-prompt-field" aria-label="Intent">
          <div className="image-direction-prompt-field-heading">
            <h4 className="type-label">Intent</h4>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={
                editingIntent ? "Finish editing intent" : "Edit intent"
              }
              aria-pressed={editingIntent}
              onClick={() => setEditingIntent((value) => !value)}
            >
              {editingIntent ? (
                <Check aria-hidden="true" />
              ) : (
                <Pencil aria-hidden="true" />
              )}
            </Button>
          </div>
          {editingIntent ? (
            <Textarea
              label="What this imagery type should achieve"
              value={authoring.intent}
              maxLength={1000}
              onChange={(event) =>
                setAuthoring((current) => ({
                  ...current,
                  intent: event.target.value,
                }))
              }
            />
          ) : (
            <p className="type-body-sm">
              {authoring.intent ||
                "No separate intent saved. The current prompt body carries the image direction."}
            </p>
          )}
        </section>

        <section
          className="image-direction-prompt-field"
          aria-label="Variables"
        >
          <div className="image-direction-prompt-field-heading">
            <h4 className="type-label">Variables</h4>
            {addableVariables.length > 0 && (
              <SubMenu
                label="Add a saved prompt variable"
                placement="bottom-end"
                trigger={(props) => (
                  <Button {...props} type="button" size="icon" variant="ghost">
                    <Plus aria-hidden="true" />
                  </Button>
                )}
              >
                {addableVariables.map((variable) => (
                  <MenuItem
                    key={variable.key}
                    onSelect={() =>
                      setAuthoring((current) => ({
                        ...current,
                        variables: [...current.variables, variable.key],
                      }))
                    }
                  >
                    {`{{${variable.key}}}`} · {variable.source}
                  </MenuItem>
                ))}
              </SubMenu>
            )}
          </div>
          <div className="image-direction-variables">
            {authoring.variables.length ? (
              authoring.variables.map((key) => {
                const label = `{{${key}}}`;
                return !usedVariables.includes(key) ? (
                  <RemovableBadge
                    key={key}
                    area="direction"
                    label={label}
                    onRemove={() =>
                      setAuthoring((current) => ({
                        ...current,
                        variables: current.variables.filter(
                          (value) => value !== key,
                        ),
                      }))
                    }
                  />
                ) : (
                  <Badge key={key} variant="specimen-strip" area="direction">
                    {label}
                  </Badge>
                );
              })
            ) : (
              <p className="type-body-sm">
                No variables saved for this template.
              </p>
            )}
          </div>
          <FieldHelp>
            Choose a variable to use in Intent, Rules, or Prompt. Remove its
            placeholders before removing the variable.
          </FieldHelp>
        </section>

        <section className="image-direction-prompt-field" aria-label="Rules">
          <div className="image-direction-prompt-field-heading">
            <h4 className="type-label">Rules</h4>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Add rule"
              disabled={authoring.rules.length >= 12}
              onClick={() => {
                setEditingRules(true);
                setAuthoring((current) => ({
                  ...current,
                  rules: [...current.rules, ""],
                }));
              }}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
          {editingRules ? (
            <>
              <div className="image-direction-rules">
                {authoring.rules.map((rule, index) => (
                  <div className="image-direction-rule" key={index}>
                    <FieldLabel>
                      Rule {index + 1}
                      <Input
                        value={rule}
                        maxLength={300}
                        onChange={(event) =>
                          updateRule(index, event.target.value)
                        }
                      />
                    </FieldLabel>
                    <div className="image-direction-rule-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move rule ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => moveRule(index, -1)}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move rule ${index + 1} down`}
                        disabled={index === authoring.rules.length - 1}
                        onClick={() => moveRule(index, 1)}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove rule ${index + 1}`}
                        onClick={() =>
                          setAuthoring((current) => ({
                            ...current,
                            rules: current.rules.filter(
                              (_, ruleIndex) => ruleIndex !== index,
                            ),
                          }))
                        }
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : authoring.rules.length ? (
            <ol className="image-direction-saved-rules type-body-sm">
              {authoring.rules.map((rule, index) => (
                <li key={`${index}:${rule}`}>{rule}</li>
              ))}
            </ol>
          ) : (
            <p className="type-body-sm">
              No separate rules saved. Existing instructions remain in the
              prompt body.
            </p>
          )}
        </section>

        <section
          className="image-direction-prompt-field"
          aria-label="Prompt body"
        >
          <div className="image-direction-prompt-field-heading">
            <h4 className="type-label">Prompt body</h4>
            <div className="image-direction-field-actions">
              {editingPrompt && (
                <SubMenu
                  label="Insert a saved variable"
                  placement="bottom-end"
                  trigger={(props) => (
                    <Button
                      {...props}
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!authoring.variables.length || !editor}
                    >
                      Insert variable <ChevronDown aria-hidden="true" />
                    </Button>
                  )}
                >
                  {authoring.variables.map((key) => (
                    <MenuItem
                      key={key}
                      onSelect={() =>
                        editor
                          ?.chain()
                          .focus()
                          .insertContent(`{{${key}}}`)
                          .run()
                      }
                    >{`{{${key}}}`}</MenuItem>
                  ))}
                </SubMenu>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={
                  editingPrompt
                    ? "Finish editing prompt body"
                    : "Edit prompt body"
                }
                aria-pressed={editingPrompt}
                onClick={() => setEditingPrompt((value) => !value)}
              >
                {editingPrompt ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Pencil aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
          {editingPrompt ? (
            <Card
              as="div"
              material="solid"
              spacing="dense"
              className="image-direction-editor-surface"
            >
              <DocumentEditorStage
                label={`${template.label} prompt editor`}
                className="image-direction-editor-stage"
                canvasClassName="image-direction-editor-canvas"
              >
                <div
                  ref={manuscriptRef}
                  className="image-direction-editor-manuscript"
                >
                  <DocumentEditorGuide
                    editor={editor}
                    containerRef={manuscriptRef}
                  />
                  {editor && <EditorContent editor={editor} />}
                </div>
              </DocumentEditorStage>
            </Card>
          ) : (
            <Card
              as="div"
              material="solid"
              spacing="dense"
              className="image-direction-saved-prompt type-body-sm"
            >
              {baselineText}
            </Card>
          )}
        </section>
      </div>

      <div className="image-direction-actions">
        {dirty && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={discard}
          >
            <RotateCcw aria-hidden="true" /> Discard changes
          </Button>
        )}
        {template.draft && !dirty ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => onPublish(template.draft!.version)}
          >
            <Check aria-hidden="true" /> Publish saved draft
          </Button>
        ) : !dirty ? (
          <p className="type-caption">
            Use the document icon to save a draft. Published artwork stays
            unchanged.
          </p>
        ) : (
          <p className="type-caption">
            Save changes as a draft with the document icon before publishing.
          </p>
        )}
      </div>
    </Card>
  );
}
