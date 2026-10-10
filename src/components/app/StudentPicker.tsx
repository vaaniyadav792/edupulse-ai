import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

/** Type-ahead student picker (scales to thousands of records). */
export function StudentPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { views } = useStore();
  const listId = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const known = text && views.some((s) => s.id === text.trim());
  return (
    <div>
      <Input list={listId} value={text} placeholder="Type a student ID…" aria-label="Student ID"
        onChange={(e) => { setText(e.target.value); const id = e.target.value.trim(); if (views.some((s) => s.id === id)) onChange(id); }} />
      <datalist id={listId}>{views.slice(0, 5000).map((s) => <option key={s.id} value={s.id}>{s.department}</option>)}</datalist>
      {text && !known && <p className="mt-1 text-xs text-destructive">No student with that ID.</p>}
    </div>
  );
}
