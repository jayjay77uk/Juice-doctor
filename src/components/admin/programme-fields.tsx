const field = 'rounded border bg-surface p-2';
export function ProgrammeFields({ values = {} }: { values?: Record<string, unknown> }) {
  return (
    <>
      <label className="flex flex-col">
        Title
        <input
          className={field}
          name="title"
          required
          maxLength={160}
          defaultValue={String(values.title ?? '')}
        />
      </label>
      <label className="flex flex-col">
        URL slug
        <input
          className={field}
          name="slug"
          required
          maxLength={100}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={String(values.slug ?? '')}
        />
      </label>
      <label className="flex flex-col">
        Summary
        <textarea
          className={field}
          name="summary"
          required
          maxLength={500}
          defaultValue={String(values.summary ?? '')}
        />
      </label>
      <label className="flex flex-col">
        Description
        <textarea
          className={field}
          name="description"
          required
          maxLength={10000}
          defaultValue={String(values.description ?? '')}
        />
      </label>
      <label className="flex flex-col">
        Format
        <select
          className={field}
          name="format"
          defaultValue={String(values.format ?? 'self_paced')}
        >
          <option value="self_paced">Self-paced</option>
          <option value="one_to_one">1:1</option>
          <option value="group">Group</option>
          <option value="corporate">Corporate</option>
        </select>
      </label>
      <label className="flex flex-col">
        Duration
        <input
          className={field}
          name="duration_label"
          maxLength={120}
          defaultValue={String(values.duration_label ?? '')}
        />
      </label>
      <label className="flex flex-col">
        Price label
        <input
          className={field}
          name="price_label"
          maxLength={120}
          placeholder="Contact the team"
          defaultValue={String(values.price_label ?? '')}
        />
      </label>
    </>
  );
}
