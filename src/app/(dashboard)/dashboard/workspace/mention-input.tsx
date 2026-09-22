"use client";

import { useState, useRef, useEffect } from "react";
import { searchEmployeesForMention } from "@/actions/workspace/workspace.actions";

interface Employee {
  id: string;
  name: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  mentionedUsers: Employee[];
  onMentionedUsersChange: (users: Employee[]) => void;
  placeholder?: string;
}

export function MentionInput({ value, onChange, mentionedUsers, onMentionedUsersChange, placeholder }: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<Employee[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const query = atMatch[1];
      setMentionStart(cursorPos - atMatch[0].length);
      if (query.length > 0) {
        const results = await searchEmployeesForMention(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
      setMentionStart(null);
    }
  }

  function selectMention(employee: Employee) {
    if (mentionStart === null || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursorPos);
    const newValue = `${before}@${employee.name} ${after}`;

    onChange(newValue);
    if (!mentionedUsers.some((u) => u.id === employee.id)) {
      onMentionedUsersChange([...mentionedUsers, employee]);
    }
    setShowSuggestions(false);
    setMentionStart(null);

    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? "Write a message... use @ to mention someone"}
        rows={3}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {showSuggestions && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border bg-popover p-1 shadow-md">
          {suggestions.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => selectMention(emp)}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              {emp.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}