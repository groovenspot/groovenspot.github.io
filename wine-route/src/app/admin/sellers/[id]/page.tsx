import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { SellerForm } from "@/components/admin/SellerForm";

export default async function EditSeller({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await prisma.seller.findUnique({ where: { id } });
  if (!s) notFound();
  return (
    <div className="stack">
      <h1 style={{ fontSize: 28 }}>{s.name}</h1>
      <p className="small muted">셀러 ID: <span className="num">{s.id}</span> (CSV 가져오기의 seller_id)</p>
      <SellerForm seller={s} />
    </div>
  );
}
