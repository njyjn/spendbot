import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button, Container, Modal } from "react-bootstrap";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import moment from "moment";
import { useTranslations } from "next-intl";
import { GetStaticPropsContext } from "next";

const fetcher = async (uri: string) => {
  const response = await fetch(uri);
  return response.json();
};

export async function getStaticProps({ locale }: GetStaticPropsContext) {
  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}

export default withPageAuthRequired(function Expense() {
  const router = useRouter();
  const t = useTranslations("God");

  const month = moment().add(1, "months").format("MMM YY");

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  return (
    <>
      <Container fluid>
        <Modal centered show={isSuccess}>
          <Modal.Body className="text-center">
            <p>✅ {t("formSubmitSuccess")}</p>
            <Button
              onClick={() => {
                setIsSuccess(false);
                router.reload();
              }}
              variant="success"
            >
              {t("formSubmitSuccessBack")}
            </Button>
          </Modal.Body>
        </Modal>
        <h1 className="text-center">🌈 {t("title")}</h1>
        <Button
          className="mt-3"
          style={{ width: "100%" }}
          variant="danger"
          onClick={async () => {
            setIsLoading(true);
            const response = await fetch(`/spend/api/clone?month=${month}`);
            if ((await response.json()).ok) {
              setIsSuccess(true);
            }
            setIsLoading(false);
          }}
        >
          {isLoading
            ? t("formSubmitLoading")
            : `🆕 ${t("formSubmit", {
                month: month,
              })}`}
        </Button>
      </Container>
    </>
  );
});
