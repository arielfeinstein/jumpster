/**
 * SaveLevelDialog.tsx
 *
 * Dialog for naming a level and choosing its difficulty before saving.
 * Uses the same Radix Dialog + Portal pattern as ConfirmationDialog.
 *
 * Validation rules:
 *   - Must not be empty / whitespace-only
 *   - Only alphanumeric characters, spaces, hyphens, and underscores
 *   - Maximum 50 characters
 */

import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from 'radix-ui';
import type { Difficulty } from '../../../shared/types/Difficulty';
import styles from './SaveLevelDialog.module.css';

const NAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;
const MAX_LENGTH = 50;

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
    { value: 'easy',   label: 'Easy'   },
    { value: 'medium', label: 'Medium' },
    { value: 'hard',   label: 'Hard'   },
];

interface SaveLevelDialogProps {
    open: boolean;
    defaultTitle?: string;
    defaultDifficulty?: Difficulty;
    onSave: (name: string, difficulty: Difficulty) => void;
    onCancel: () => void;
}

export default function SaveLevelDialog({ open, defaultTitle, defaultDifficulty, onSave, onCancel }: SaveLevelDialogProps) {
    const [name, setName] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when dialog opens and reset state.
    useEffect(() => {
        if (open) {
            setName(defaultTitle ?? '');
            setDifficulty(defaultDifficulty ?? 'medium');
            setError(null);
            // Delay focus so Radix has time to mount the content.
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    function validate(value: string): string | null {
        if (!value.trim()) return 'Level name cannot be empty.';
        if (!NAME_PATTERN.test(value)) return 'Only letters, numbers, spaces, hyphens, and underscores are allowed.';
        if (value.length > MAX_LENGTH) return `Name must be ${MAX_LENGTH} characters or fewer.`;
        return null;
    }

    function handleSave() {
        const err = validate(name);
        if (err) { setError(err); return; }
        onSave(name.trim(), difficulty);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') handleSave();
    }

    return (
        <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content className={styles.content}>
                    <Dialog.Title className={styles.title}>Save Level</Dialog.Title>
                    <Dialog.Description className={styles.description}>
                        Enter a name and choose a difficulty for your level.
                    </Dialog.Description>
                    <input
                        ref={inputRef}
                        className={styles.input}
                        type="text"
                        placeholder="My Level"
                        value={name}
                        maxLength={MAX_LENGTH + 1}
                        onChange={(e) => { setName(e.target.value); setError(null); }}
                        onKeyDown={handleKeyDown}
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.difficultyGroup}>
                        {DIFFICULTIES.map(({ value, label }) => (
                            <label key={value} className={styles.difficultyOption}>
                                <input
                                    type="radio"
                                    name="difficulty"
                                    value={value}
                                    checked={difficulty === value}
                                    onChange={() => setDifficulty(value)}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.cancelButton} onClick={onCancel}>Cancel</button>
                        <button className={styles.saveButton} onClick={handleSave}>Save</button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
