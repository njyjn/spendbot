import { useTranslations } from "next-intl";
import { Link } from "@nextui-org/react";
export default function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer className="w-full flex items-center justify-center py-3">
      <Link
        isExternal
        className="flex items-center gap-1 text-current"
        href="https://www.ngsim.net/"
        title="NGSIM"
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="text-default-600">{t("footer")} ❤️ </span>
        <p className="text-primary">NGSIM</p>
      </Link>
    </footer>
  );
}

Footer.messages = ["Footer"];
