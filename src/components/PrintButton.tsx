"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-dark no-print">
      Imprimer / Enregistrer en PDF
    </button>
  );
}
