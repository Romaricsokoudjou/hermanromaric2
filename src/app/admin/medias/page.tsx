import { requirePermission } from "@/lib/auth";
import { AdminTitle } from "@/components/admin";
import { MediaManager } from "./MediaManager";
import { MEDIA_FOLDERS } from "@/lib/media";

export const metadata = { title: "Médiathèque" };

export default async function Page() {
  await requirePermission("content.manage");
  return (
    <div>
      <AdminTitle title="Médiathèque" subtitle="Téléversez, remplacez et supprimez images, vidéos, documents et logos. Copiez ensuite l'URL dans le contenu concerné." />
      <MediaManager folders={[...MEDIA_FOLDERS]} />
    </div>
  );
}
