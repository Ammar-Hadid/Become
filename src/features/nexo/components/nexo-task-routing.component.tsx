"use client";

import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { ProgressIndicator } from "@/components/ui/progress/progress-indicator.component";
import { Input } from "@/components/ui/forms/input.component";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { Route, Search } from "lucide-react";
import { NexoRouteInspector } from "@/features/nexo/components/nexo-route-inspector.component";
import type { NexoProfile } from "@/features/nexo/schemas/nexo-settings.schema";

type RoutingTask = {
  id: string;
  version: number;
  group: string;
  label: string;
  description: string;
};

type RoutingFilter = "all" | "routed" | "needs-setup";

export function NexoTaskRouting({
  tasks,
  profiles,
  assignments,
  completeProfileIds,
  onAssignmentChange,
}: {
  tasks: readonly RoutingTask[];
  profiles: NexoProfile[];
  assignments: Record<string, string>;
  completeProfileIds: ReadonlySet<string>;
  onAssignmentChange: (taskId: string, profileId: string) => void;
}) {
  const searchId = useId();
  const mobileSearchId = useId();
  const mobileFilterId = useId();
  const mobileTaskId = useId();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const [filter, setFilter] = useState<RoutingFilter>("all");
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id ?? "");

  const profilesById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );
  const routedTaskCount = tasks.filter((task) =>
    completeProfileIds.has(assignments[task.id] ?? ""),
  ).length;
  const profileIdsInUse = new Set(
    tasks.flatMap((task) => {
      const profileId = assignments[task.id];
      return profileId ? [profileId] : [];
    }),
  );
  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const profile = profilesById.get(assignments[task.id] ?? "");
        const isRouted = completeProfileIds.has(profile?.id ?? "");
        const matchesFilter =
          filter === "all" ||
          (filter === "routed" && isRouted) ||
          (filter === "needs-setup" && !isRouted);
        const searchable = [
          task.label,
          task.id,
          task.description,
          task.group,
          profile?.name,
          profile?.model,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();
        return matchesFilter && searchable.includes(deferredQuery);
      }),
    [
      assignments,
      completeProfileIds,
      deferredQuery,
      filter,
      profilesById,
      tasks,
    ],
  );
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, RoutingTask[]>();
    for (const task of filteredTasks) {
      groups.set(task.group, [...(groups.get(task.group) ?? []), task]);
    }
    return [...groups];
  }, [filteredTasks]);
  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ??
    filteredTasks[0];
  const selectedProfile = selectedTask
    ? profilesById.get(assignments[selectedTask.id] ?? "")
    : undefined;
  const selectedRouteComplete = completeProfileIds.has(
    selectedProfile?.id ?? "",
  );
  const needsSetupCount = tasks.length - routedTaskCount;

  return (
    <>
      <header className="nexo-section-heading nexo-routing-heading">
        <div>
          <p className="eyebrow">3. Assign tasks</p>
          <h3 id="nexo-assignment-title">Choose a model for each task</h3>
          <p>Choose a task, then select the model it should use.</p>
        </div>
        <Route aria-hidden="true" />
      </header>

      <div className="nexo-routing-coverage" aria-label="Profile coverage">
        <div className="nexo-routing-coverage-copy">
          <span>Profile coverage</span>
          <strong>
            {routedTaskCount} / {tasks.length} routed
          </strong>
        </div>
        <ProgressIndicator
          label={`${routedTaskCount} of ${tasks.length} tasks assigned`}
          value={routedTaskCount}
          max={Math.max(tasks.length, 1)}
          area="direction"
        />
        <dl>
          <div>
            <dt>Profiles in use</dt>
            <dd>{profileIdsInUse.size}</dd>
          </div>
          <div>
            <dt>Need setup</dt>
            <dd>{needsSetupCount}</dd>
          </div>
        </dl>
      </div>

      <div className="nexo-routing-mobile-picker">
        <label className="nexo-route-search" htmlFor={mobileSearchId}>
          <Search aria-hidden="true" />
          <span className="sr-only">Search active AI tasks</span>
          <Input
            id={mobileSearchId}
            type="search"
            value={query}
            placeholder="Search tasks"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="nexo-routing-mobile-selects">
          <label htmlFor={mobileFilterId}>
            Routing state
            <NativeSelect
              id={mobileFilterId}
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as RoutingFilter)
              }
            >
              <option value="all">All tasks ({tasks.length})</option>
              <option value="routed">Routed ({routedTaskCount})</option>
              <option value="needs-setup">
                Needs setup ({needsSetupCount})
              </option>
            </NativeSelect>
          </label>
          <label htmlFor={mobileTaskId}>
            Choose a task
            <NativeSelect
              id={mobileTaskId}
              value={selectedTask?.id ?? ""}
              disabled={!selectedTask}
              onChange={(event) => setSelectedTaskId(event.target.value)}
            >
              {selectedTask ? null : (
                <option value="">No matching tasks</option>
              )}
              {groupedTasks.map(([group, groupTasks]) => (
                <optgroup key={group} label={group}>
                  {groupTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.label} —{" "}
                      {completeProfileIds.has(assignments[task.id] ?? "")
                        ? "Routed"
                        : "Needs setup"}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          </label>
        </div>
      </div>
      <span className="sr-only" role="status">
        {filteredTasks.length} active{" "}
        {filteredTasks.length === 1 ? "task" : "tasks"} shown
      </span>

      <div className="nexo-routing-workbench">
        <div className="nexo-route-catalog">
          <div className="nexo-route-toolbar">
            <label className="nexo-route-search" htmlFor={searchId}>
              <Search aria-hidden="true" />
              <span className="sr-only">Search active AI tasks</span>
              <Input
                id={searchId}
                type="search"
                value={query}
                placeholder="Search tasks"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="nexo-route-filters" aria-label="Filter tasks">
              {(
                [
                  ["all", "All", tasks.length],
                  ["routed", "Routed", routedTaskCount],
                  ["needs-setup", "Needs setup", needsSetupCount],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label} <span>{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="nexo-route-index">
            {groupedTasks.length > 0 ? (
              groupedTasks.map(([group, groupTasks]) => (
                <section key={group} className="nexo-route-group">
                  <header>
                    <h4>{group}</h4>
                    <span>{groupTasks.length}</span>
                  </header>
                  <div className="nexo-route-group-list">
                    {groupTasks.map((task) => {
                      const profile = profilesById.get(
                        assignments[task.id] ?? "",
                      );
                      const isRouted = completeProfileIds.has(
                        profile?.id ?? "",
                      );
                      const isSelected = selectedTask?.id === task.id;
                      return (
                        <button
                          key={task.id}
                          type="button"
                          className="nexo-route-task"
                          data-selected={isSelected || undefined}
                          aria-pressed={isSelected}
                          aria-controls="nexo-route-inspector"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <span
                            className="nexo-route-task-state"
                            data-ready={isRouted || undefined}
                            aria-hidden="true"
                          />
                          <span className="nexo-route-task-copy">
                            <strong>{task.label}</strong>
                            <span>
                              {profile
                                ? profile.name || "Untitled profile"
                                : "No profile assigned"}
                            </span>
                          </span>
                          <span className="nexo-route-task-status">
                            {isRouted ? "Routed" : "Needs setup"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              <div className="nexo-route-empty" role="status">
                <Search aria-hidden="true" />
                <strong>No matching tasks</strong>
                <p>Try another search or show all routing states.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

        <NexoRouteInspector
          task={selectedTask}
          profiles={profiles}
          profile={selectedProfile}
          profileId={selectedTask ? (assignments[selectedTask.id] ?? "") : ""}
          routeComplete={selectedRouteComplete}
          onProfileChange={(profileId) => {
            if (selectedTask) onAssignmentChange(selectedTask.id, profileId);
          }}
        />
      </div>
    </>
  );
}
