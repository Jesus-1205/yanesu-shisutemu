import React from "react";
import Modal from "@/ui-components/Modal";
import InvoiceAIModalContent from "./InvoiceAIModalContent";
import type { Invoice } from "../types";

export interface InvoiceAIModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export const InvoiceAIModal: React.FC<InvoiceAIModalProps> = ({
  open,
  onClose,
  invoice,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Información escaneada por IA"
      className="max-w-lg"
    >
      <InvoiceAIModalContent invoice={invoice} />
    </Modal>
  );
};

export default InvoiceAIModal;
