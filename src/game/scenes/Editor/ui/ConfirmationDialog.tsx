/**
 * ConfirmationDialog.tsx
 *
 * Generic confirmation dialog built on Radix Dialog.
 *
 * Rendered via Portal so it sits outside the editor's pointer-events:none
 * overlay. Clicking outside the dialog or pressing Escape counts as cancel
 * (Radix Dialog default behaviour).
 *
 * Currently used for cascade-delete confirmation, but the component is
 * generic enough for any future confirm/cancel prompt.
 */

import { Dialog } from 'radix-ui';
import styles from './ConfirmationDialog.module.css';

interface ConfirmationDialogProps {
    open: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmationDialog({ open, message, onConfirm, onCancel }: ConfirmationDialogProps) {
    return (
        <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content className={styles.content}>
                    <Dialog.Title className={styles.title}>Confirm Delete</Dialog.Title>
                    <Dialog.Description className={styles.description}>{message}</Dialog.Description>
                    <div className={styles.actions}>
                        <button className={styles.cancelButton} onClick={onCancel}>Cancel</button>
                        <button className={styles.confirmButton} onClick={onConfirm}>Delete</button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
