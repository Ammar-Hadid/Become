import { Badge } from "@/components/ui/badges/badge.component";
import { Card } from "@/components/ui/cards/card.component";

export type ImagePromptPackageView = {
  prompt: string;
  receipt: string;
  templateVersions: { key: string; version: number }[];
  references: { kind: string; id: string; href: string }[];
  variant: string;
  profileVersion: number;
  briefRevision: number;
  intentVersion: number;
  seasonOverride: boolean;
};

export function ImageDirectionPackagePreview({
  imagePackage,
}: {
  imagePackage: ImagePromptPackageView;
}) {
  return (
    <div
      className="image-direction-inspector-result"
      aria-label="Assembled prompt package"
    >
      <div className="image-direction-result-heading">
        <p className="type-label">Assembled prompt</p>
        <Badge variant="specimen-strip" area="direction">
          {imagePackage.variant}
        </Badge>
      </div>
      {imagePackage.seasonOverride && (
        <p className="type-body-sm">
          A saved Season reference prompt overrides the shared reference
          template for this package.
        </p>
      )}
      <Card
        as="div"
        material="solid"
        spacing="dense"
        className="image-direction-preview-prompt type-body-sm"
      >
        {imagePackage.prompt}
      </Card>
      <dl className="image-direction-package-facts">
        <div>
          <dt className="type-caption">Profile</dt>
          <dd className="type-label">v{imagePackage.profileVersion}</dd>
        </div>
        <div>
          <dt className="type-caption">Season brief</dt>
          <dd className="type-label">v{imagePackage.briefRevision}</dd>
        </div>
        <div>
          <dt className="type-caption">Visual intent</dt>
          <dd className="type-label">v{imagePackage.intentVersion}</dd>
        </div>
      </dl>
      <div className="image-direction-provenance">
        <div>
          <h4 className="type-label">Template versions</h4>
          <ul className="type-body-sm">
            {imagePackage.templateVersions.map((template) => (
              <li key={`${template.key}-${template.version}`}>
                <span>{template.key}</span>
                <span>v{template.version}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="type-label">References</h4>
          {imagePackage.references.length ? (
            <ul className="type-body-sm">
              {imagePackage.references.map((reference) => (
                <li key={`${reference.kind}-${reference.id}`}>
                  <a href={reference.href}>{reference.kind}</a>
                  <span>{reference.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-body-sm">
              No image references required for this package.
            </p>
          )}
        </div>
      </div>
      <div className="image-direction-receipt">
        <span className="type-caption">Package receipt</span>
        <code className="type-system">{imagePackage.receipt}</code>
      </div>
    </div>
  );
}
