# Approved empty states

The product owner approved these 16 contextual treatments. Use the shared `EmptyState` component in `src/components/ui/empty-states/` and choose `pattern` by the **reason** the content is empty. The visual treatment is shared; the owning feature supplies truthful title, description, optional scope and a real action. Do not imply that data is zero, work is complete, or a prerequisite exists unless domain facts establish it.

| Context              | Approved patterns                                                                                                    | Intended use                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| First move           | `project-anatomy`, `account-gateway`, `audience-constellation`, `editorial-canvas`, `goal-trajectory`, `first-focus` | Explain the first useful action. `project-anatomy` must also say that sessions can exist without a project.                |
| Data has not arrived | `ledger-replacement`, `unplotted-chart`                                                                              | Replace an empty table or chart without invented rows, bars, points or a misleading zero axis.                             |
| Narrowed view        | `active-filter`, `search-echo`, `time-window-silence`, `archive-quiet`                                               | Preserve the query, filter or date scope through `context`; offer the smallest useful reset or broader view.               |
| Clear or paused      | `attention-resolved`, `review-queue-clear`, `publication-pause`, `follow-up-complete`                                | Acknowledge a truly clear queue, or state that nothing is scheduled. An empty publishing schedule is not a completed task. |

The approved set deliberately excludes the other four gallery proposals: Evidence shelf, Release history, Commitment panel and Unlinked evidence. They are not shared defaults. The corrected Project anatomy and Audience constellation connector paths use the same coordinate space as their nodes, so endpoints stay attached at desktop and mobile widths.

Use `area` to select Dashboard gold or a domain accent. Direction uses the shared gold. The recurring surface, diagram, spacing, edge, glow, and responsive dimensions are in the **Approved empty states** section of `src/app/styles/tokens.css`. Existing semantic typography tokens control copy; do not add local font sizes or line heights. Icons use the shared `IconFrame` treatment where the selected pattern calls for one. Consumer actions should use the shared `Button` and must perform the stated operation.

Use `size="compact"` when an empty state sits inside a small widget that already supplies its own card surface and heading. This keeps the pattern's meaning and area accent while replacing the large illustration with a compact icon or motif and removing the nested panel. Full-page and wide-region empty states keep the approved illustrated treatment.

Empty state content is static, so do not make it a live region. Loading, failures, missing permissions and real empty results are separate states. An actual pending request uses the approved loading components; an error provides recovery, not an empty-state illustration. Decorative artwork is hidden from assistive technology. The `aria-label` on the region names its purpose while the text remains visible.

This records the shared visual system. Existing feature pages still contain earlier empty-state implementations and should be migrated as their own screens are rebuilt and approved.
