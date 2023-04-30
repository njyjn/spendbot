import React, { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Button, Container, Form, InputGroup, Modal } from "react-bootstrap";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import moment from "moment";
import { request } from "http";

const fetcher = async (uri: string) => {
  const response = await fetch(uri);
  return response.json();
};

export default withPageAuthRequired(function Expense() {
  const router = useRouter();

  const month = moment().add(1, 'months').format("MMM YY");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  return (
    <>
      <Container fluid>
        <Modal centered show={isSuccess}>
          <Modal.Body className="text-center">
            <p>✅ Сделанный!</p>
            <Button
              onClick={() => {
                setIsSuccess(false);
                router.reload();
              }}
              variant="success"
            >
              Закрой
            </Button>
          </Modal.Body>
        </Modal>
        <h1 className="text-center">🌈 Бог</h1>
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
          {isLoading ? "Отправка..." : `🆕 Месяц подготовки к ${month} года`}
        </Button>
      </Container>
    </>
  );
});
