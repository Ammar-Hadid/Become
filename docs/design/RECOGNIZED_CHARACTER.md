# Recognized character

Approved by the owner on 16 October 2026 at `/character-reference-candidate`, followed by explicit approval to integrate connected onboarding.

`RecognizedCharacter` and `VersionDrawer` live in `src/components/ui/recognized-character/`. The compact row shows a contained picture, readable name/source/adaptation, and shared **Change character** / **Change version** actions. Desktop uses a 112 × 84 picture; phones use 96 × 72 with actions below. Values live in `tokens.css`. Missing, loading or failed pictures never block the next step. Loading has an eight-second deadline with retry; late results cannot replace another identity.

The edition drawer groups real catalogue editions by TV anime, Manga, Anime film and Other editions, with cover, release year and current selection. It uses the shared Drawer focus trap, Escape handling and trigger focus return. Shared Storybook stories include missing/failed pictures, phone and edition selection; typed metadata records both components.

Connected preparation is **Character → World & mood → Summary**. Lookup retrieves catalogue matches without waiting for AI identification or the reference gallery. Ambiguous matches require a choice. The recognized row appears in World & mood and Summary. Change character returns to lookup; Change version opens the drawer. Corrections preserve the entered world and mood. Changing identity/version from Summary returns to World & mood so a new summary must be prepared.

Continue saves the displayed catalogue identity and edition, imports authentic references, prepares the run, and starts source-grounded text preparation. Save and leave saves the same identity and world draft without starting preparation. The server owns revisions and stale-identity checks. Refresh restores saved identity; unsaved text is held in a Season-scoped local draft.

Recognition is **not likeness approval**. Original images and their explicit review checkbox appear at Summary before artwork preparation. The server requires one or two current, nonretired originals belonging to the selected identity/adaptation, plus explicit likeness confirmation, before approving the summary. Text preparation does not approve images. No artwork or active Season is replaced by simply seeing or correcting recognition.

The older `CharacterConfirmation` carousel remains available for explicitly requested identity-review surfaces and historical previews. Connected onboarding no longer includes its separate confirmation checkpoint.

On 16 October 2026 the owner also requested replacing the normal Season opening with this connected flow. `/direction/seasons/[year]/[quarter]/opening` and the connected preview now share the Season-owned controller and view. The detailed profile workspace remains reachable through Advanced editing.
