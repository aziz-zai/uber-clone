import { redirect } from "next/navigation";

// MVP: Das Operator-Portal ist die einzige Oberfläche.
// Die Rider-App bekommt später eine eigene Route-Gruppe `(rider)`.
export default function Home() {
  redirect("/vehicles");
}
