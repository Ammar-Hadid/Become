# Become sound system

The product owner approved these twelve original cues. The editable source of truth for event assignments, default playback level, default enabled state, and repetition gaps is `src/components/ui/sound/config/sound-system.config.ts`. Sound recipes and their pitch/timing profiles live in the adjacent shared sound catalog and player. The `/sound-review` route remains an audition surface, not the production trigger source.

| Confirmed event | Cue | Rule |
| --- | --- | --- |
| A meaningful discrete control choice | Pulse Pin | One small acknowledgment; not on every button, hover, typing, or scroll. The dashboard attention and goal carousel buttons use it. |
| A drawer, dialog, or substantial overlay opens | Aperture | Play on the open action, including the dashboard C.O.T.S composer and timer dialog. Ordinary account and notification menus stay silent. |
| Navigation enters another product area | Horizon | Play after the route actually changes area, including switching between two non-Dashboard areas. Do not play for a refresh or a nested page inside the same area. |
| A layer closes, or navigation returns to Dashboard | Gravity | Play for explicit dismissals and a confirmed return to Dashboard. When a layer closes because a different route is selected, the destination's navigation cue takes precedence. Do not pair Gravity with a successful timer completion. |
| A non-timer save is confirmed | Soft Ascent | Play only after a successful commit. The current dashboard has no such mutation; composing a local C.O.T.S question is not a save. |
| A new actionable attention item arrives | Pending Line | Play once when a newly identified item enters the live dashboard view. Do not play for pre-existing items on page load, routine refreshes, or passive badge counts. |
| An action is definitively rejected | Red Offset | Play on a known failure or hard stop alongside visible error text. If the outcome is uncertain and reconciliation is needed, stay silent. |
| A focus session is confirmed started or resumed | Ignition | Resume shares the activation meaning. Do not play when the start form merely opens or while a request is pending. |
| A focus session is confirmed paused | Hold | No timer tick or recurring pause sound. |
| A focus session is confirmed completed | Closure | This is the sole completion cue for that timer mutation; do not stack Soft Ascent or Gravity on it. |
| An earned, rare Season-level milestone is confirmed | Season Seal | Never for calendar progress, page load, every goal increment, or merely viewing a ceremony. The current dashboard does not generate such an event, so this cue is reserved. |
| A complete C.O.T.S answer becomes available | Thought Arrives | Never for opening the composer, sending a local question, a loading state, or generated words. C.O.T.S answers are not connected on the current dashboard, so this cue is reserved. |

Sound is supplemental to visible state and must never drive or delay a workflow. It starts only after a user gesture has unlocked browser audio; there is no page-load sound. A persistent **Interface sounds** switch under **Settings → Application** mutes or enables effects, and production playback skips hidden tabs. Changing the preference stops a currently playing cue. The system never overrides device volume. These rules follow [Microsoft's guidance on restrained, supplemental interface sound](https://learn.microsoft.com/en-us/windows/win32/uxguide/vis-sound), [MDN's Web Audio user-gesture and control guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), and [W3C's audio-control guidance](https://www.w3.org/WAI/WCAG21/Understanding/audio-control).
