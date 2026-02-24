type ModulePlaceholderProps = {
  title: string;
  description: string;
  nextMilestones: string[];
};

export function ModulePlaceholder({
  title,
  description,
  nextMilestones,
}: ModulePlaceholderProps) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border bg-card p-5 text-card-foreground">
        <h2 className="text-lg font-medium">Next milestones</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {nextMilestones.map((milestone) => (
            <li key={milestone}>{milestone}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
