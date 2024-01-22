import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer>
      {t("footer")} ❤️{" "}
      <a
        href="https://www.ngsim.net/"
        target="_blank"
        rel="noopener noreferrer"
      >
        NGSIM
      </a>
    </footer>
  );
}

Footer.messages = ["Footer"];
