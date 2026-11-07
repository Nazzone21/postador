import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFormat } from "@/lib/formats";
import { scheduleOptions } from "@/lib/options";
import { todayKey } from "@/lib/time";
import { EmptyState, PageHeader, PLATFORM_LABEL } from "@/components/ui";
import { BulkForm } from "@/components/bulk-form";
import { CarouselForm } from "@/components/carousel-form";
import { YoutubeForm } from "@/components/youtube-form";

const SUBTITLE: Record<string, string> = {
  posts: "Envie imagens e distribua os posts entre dias e horários fixos.",
  carrossel: "Escolha de 2 a 10 imagens ou vídeos, na ordem em que devem aparecer.",
  reels: "Envie vídeos, aplique um modelo e distribua tudo entre dias e horários fixos.",
  stories: "Envie imagens ou vídeos e distribua os Stories entre contas, dias e horários.",
  youtube: "Um vídeo por agendamento, com título, descrição e privacidade.",
};

export default async function FormatoPage({ params }: PageProps<"/agendar/[formato]">) {
  const user = await requireUser();
  const format = getFormat((await params).formato);
  if (!format) notFound();
  const { accounts, media } = await scheduleOptions(user.id, format);

  return (
    <>
      <Link href="/agendar" className="mb-3 inline-flex text-sm text-muted hover:text-ink">← Trocar formato</Link>
      <PageHeader title={`Agendar ${format.name.toLowerCase()}`} subtitle={SUBTITLE[format.id]} />
      {accounts.length === 0 ? (
        <EmptyState title="Nenhuma conta compatível">
          Este formato precisa de uma conta {format.platforms.filter((p) => p !== "simulado").map((p) => PLATFORM_LABEL[p] ?? p).join(" ou ")}{" "}
          (ou uma conta de teste). Conecte em <Link href="/paginas" className="text-accent-ink underline">Páginas e contas</Link>.
        </EmptyState>
      ) : format.id === "carrossel" ? (
        <CarouselForm accounts={accounts} media={media} defaultDate={todayKey()} />
      ) : format.id === "youtube" ? (
        <YoutubeForm accounts={accounts} media={media} defaultDate={todayKey()} />
      ) : (
        <BulkForm format={format.id} accounts={accounts} media={media} defaultDate={todayKey()} />
      )}
    </>
  );
}
