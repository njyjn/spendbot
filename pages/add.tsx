import React, { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Button, Container, Form, InputGroup, Modal } from "react-bootstrap";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import moment from "moment";

const fetcher = async (uri: string) => {
  const response = await fetch(uri);
  return response.json();
};

export default withPageAuthRequired(function Expense() {
  const router = useRouter();

  const { data, error } = useSWR("/spend/api/definitions", fetcher);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [person, setPerson] = useState("");
  const [date, setDate] = useState(new Date(Date.now()));
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState(0);
  const [card, setCard] = useState("");

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
        <h1 className="text-center">💸</h1>
        {data ? (
          <Form
            onSubmit={async (event) => {
              event.preventDefault();
              setIsLoading(true);
              const month = moment(date).format("MMM YY");
              const response = await fetch(
                `/spend/api/expense?month=${month}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    date: date.toDateString(),
                    item,
                    category,
                    cost,
                    card,
                    person,
                  }),
                }
              );
              if ((await response.json()).ok) {
                setIsSuccess(true);
              }
              setIsLoading(false);
            }}
          >
            <Form.Group className="mb-3">
              <Form.Label for="person">🧍 Человек</Form.Label>
              <Form.Select
                id="person"
                name="person"
                required
                onChange={(event) => setPerson(event.target.value)}
              >
                <option value={undefined}>Выберите человека...</option>
                {data["persons"].map((e: string) => {
                  return (
                    <option key={"Person." + e} value={e}>
                      {e}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label for="date">📆 Дату</Form.Label>
              <Form.Control
                id="date"
                name="date"
                type="date"
                defaultValue={date.toDateString()}
                onChange={(event) => setDate(new Date(event.target.value))}
              ></Form.Control>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label for="item">💁 Расход</Form.Label>
              <Form.Control
                id="item"
                name="item"
                required
                type="text"
                onChange={(event) => setItem(event.target.value)}
              ></Form.Control>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label for="category">📦 Категория</Form.Label>
              <Form.Select
                id="category"
                name="category"
                required
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value={undefined}>Выберите категорию...</option>
                {data["categories"].map((e: string) => {
                  return (
                    <option key={"Category." + e} value={e}>
                      {e}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label for="cost">💰 Сумма</Form.Label>
              <InputGroup className="mb-2">
                <InputGroup.Text>SGD</InputGroup.Text>
                <Form.Control
                  id="cost"
                  name="cost"
                  required
                  type="number"
                  onChange={(event) => setCost(parseFloat(event.target.value))}
                ></Form.Control>
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label for="card">💳 Карта</Form.Label>
              <Form.Select
                id="card"
                name="card"
                required
                onChange={(event) => setCard(event.target.value)}
              >
                <option value={undefined}>Выберите карту...</option>
                {data["cards"].map((e: string) => {
                  return (
                    <option key={"Card." + e} value={e}>
                      {e}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
            <Button
              className="mt-3"
              style={{ width: "100%" }}
              variant="success"
              type="submit"
            >
              {isLoading ? "Отправка..." : "➕ Представить"}
            </Button>
          </Form>
        ) : (
          <p>Загрузка...</p>
        )}
      </Container>
    </>
  );
});
