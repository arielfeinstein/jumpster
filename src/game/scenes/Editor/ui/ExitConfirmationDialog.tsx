/**
 * ExitConfirmationDialog.tsx
 *
 * Confirms that the user wants to leave the editor without saving.
 * The message hints that they should use the Save button if they want
 * to keep their work.
 *
 * Intentionally separate from ConfirmationDialog so each dialog's
 * wording stays self-contained and neither needs configurable props.
 */

import { Dialog } from 'radix-ui';
import styles from './ConfirmationDialog.module.css';

interface ExitConfirmationDialogProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ExitConfirmationDialog({ open, onConfirm, onCancel }: ExitConfirmationDialogProps) {
    return (
        <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content className={styles.content}>
                    <Dialog.Title className={styles.title}>Exit Editor</Dialog.Title>
                    <Dialog.Description className={styles.description}>
                        Unsaved changes will be lost. Use the Save button to save your level before exiting.
                    </Dialog.Description>
                    <div className={styles.actions}>
                        <button className={styles.cancelButton} onClick={onCancel}>Cancel</button>
                        <button className={styles.confirmButton} onClick={onConfirm}>Exit Without Saving</button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
