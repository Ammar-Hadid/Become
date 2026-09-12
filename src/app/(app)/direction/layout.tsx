import { DirectionNavigation } from "@/features/direction/navigation/components/direction-navigation.component";
import "@/features/direction/styles/direction.css";
import "@/features/direction/thinking/styles/thinking.css";

export default function DirectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell direction-shell">
      <header className="direction-masthead">
        <div>
          <p className="eyebrow">A life in seasons</p>
          <h1>Direction</h1>
        </div>
        <p>Choose what this season means, then let the evidence stay honest.</p>
      </header>
      <DirectionNavigation />
      {children}
    </div>
  );
}
