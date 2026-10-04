import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PaymentReferenceInput from "@/features/invoices/components/PaymentReferenceInput";
import PaymentReceiptUpload from "@/features/invoices/components/PaymentReceiptUpload";
import PaymentNotesInput from "@/features/invoices/components/PaymentNotesInput";
import { usePaymentFormStore } from "@/features/invoices/store/paymentFormStore";

describe("Payment Form Extra Components", () => {
  it("renders PaymentReferenceInput and updates store", () => {
    usePaymentFormStore.getState().reset();
    const { rerender } = render(<PaymentReferenceInput visible={false} />);
    expect(screen.queryByPlaceholderText("Número de referencia")).not.toBeInTheDocument();

    rerender(<PaymentReferenceInput visible={true} />);
    const input = screen.getByPlaceholderText("Número de referencia");
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "REF-12345" } });
    expect(usePaymentFormStore.getState().referencia).toBe("REF-12345");
  });

  it("renders PaymentReceiptUpload correctly", () => {
    usePaymentFormStore.getState().reset();
    render(<PaymentReceiptUpload />);
    expect(screen.getByText("Comprobantes de pago")).toBeInTheDocument();
  });

  it("renders PaymentNotesInput and updates store", () => {
    usePaymentFormStore.getState().reset();
    render(<PaymentNotesInput />);
    const textarea = screen.getByPlaceholderText("Notas opcionales sobre este pago...");
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "Pago parcial acordado" } });
    expect(usePaymentFormStore.getState().observaciones).toBe("Pago parcial acordado");
  });
});
