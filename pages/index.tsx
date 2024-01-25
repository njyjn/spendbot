import { GetStaticPropsContext } from "next";
import DefaultLayout from "@/layouts/default";
import { subtitle, title } from "@/components/primitives";
import { useTranslations } from "next-intl";
import { Button, Link } from "@nextui-org/react";
import { button as buttonStyles } from "@nextui-org/theme";
import { GithubIcon } from "@/components/icons";
import Image from "next/image";
import homePic from "@/public/images/home.png";

export async function getStaticProps({ locale }: GetStaticPropsContext) {
  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}

export default function Home() {
  const t = useTranslations("Home");

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center">
        <div className="h-screen max-w-[900px] gap-2 grid grid-cols-12 grid-rows-1">
          <div className="col-span-12 sm:col-span-6 m-auto">
            <div className="inline-block max-w-lg text-center justify-center">
              <h1 className={title()}>
                {t.rich("title", {
                  colored: (chunks) => (
                    <span
                      className={title({
                        color: "cyan",
                      })}
                    >
                      {chunks}
                    </span>
                  ),
                })}
              </h1>
              <p className={subtitle({ class: "mt-4" })}>{t("subtitle")}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button isDisabled variant="bordered">
                {t("status")}
              </Button>
              <Link
                isExternal
                className={buttonStyles({
                  radius: "full",
                })}
                href="https://github.com/njyjn/spendbot"
              >
                <GithubIcon size={20} width={undefined} height={undefined} />
                Github
              </Link>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 m-auto">
            <div className="flex gap-3 items-center justify-center">
              <Image
                width={0}
                height={0}
                sizes="70vw"
                style={{ width: "70%", height: "auto" }}
                src={homePic}
                alt="Screenshot of app"
              />
            </div>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
