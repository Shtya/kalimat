import { redirect } from "next/navigation";

/** The import now opens as a panel on «المنهج والأسئلة»; ImportForm in this folder is what it shows. */
export default function ImportPage() {
  redirect("/admin/content?panel=import");
}
