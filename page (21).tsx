import { redirect } from "next/navigation";

// O agendamento em massa de Reels agora fica em /agendar/reels.
export default function EmMassaPage() {
  redirect("/agendar/reels");
}
