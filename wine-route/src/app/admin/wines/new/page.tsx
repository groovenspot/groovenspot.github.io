import { WineForm } from "@/components/admin/WineForm";

export default function NewWine() {
  return (
    <div className="stack">
      <h1 style={{ fontSize: 28 }}>와인 추가</h1>
      <WineForm />
    </div>
  );
}
