import { GetStaticPropsContext } from "next";
import { useTranslations } from "next-intl";
import { Container } from "react-bootstrap";

export async function getStaticProps({ locale }: GetStaticPropsContext) {
  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}

export default function Custom500() {
  const t = useTranslations("Error")
  return (
    <Container fluid className="center text-center">
      <h3>¯\_(ツ)_/¯</h3>
      <br />
      <p><i>{t('poem')}</i></p>
    </Container>
  );
}