import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { GetStaticPropsContext } from "next";
import { useTranslations } from "next-intl";

export async function getStaticProps({ locale }: GetStaticPropsContext) {
  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}

export default function Custom404() {
  const t = useTranslations("Error");
  return (
    <DefaultLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-block max-w-lg text-center">
          <h1
            className={title({
              size: "sm",
            })}
          >
            ¯\_(ツ)_/¯
          </h1>
          <br />
          <p>
            <i>{t("poem")}</i>
          </p>
        </div>
      </div>
    </DefaultLayout>
  );
}
