import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GreenScore Live — Estatísticas de futebol",
    short_name: "GreenScore",
    description:
      "Placar ao vivo, gols, cartões, impedimentos, faltas, escanteios, escalações previstas e alertas do seu time favorito.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070c0a",
    theme_color: "#00a844",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
