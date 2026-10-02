import { SellerForm } from "@/components/admin/SellerForm";

export default function NewSeller() {
  return (
    <div className="stack">
      <h1 style={{ fontSize: 28 }}>셀러 등록</h1>
      <SellerForm />
    </div>
  );
}
