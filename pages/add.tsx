import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { useShowPopup } from "@vkruglikov/react-telegram-web-app";
import { Button, Container, Form, InputGroup } from "react-bootstrap";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import moment from "moment";

const fetcher = async (uri: string) => {
  const response = await fetch(uri);
  return response.json();
};

export default withPageAuthRequired(function Expense() {
  const router = useRouter();

  const showPopup = useShowPopup();
  useEffect(() => {
    const telegram = window.Telegram.WebApp;
    telegram.ready();
  });

  const { data, error } = useSWR("/spend/api/definitions", fetcher);

  const [isLoading, setIsLoading] = useState(false);

  const [date, setDate] = useState(new Date(Date.now()));
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState(0);
  const [card, setCard] = useState("");

  return (
    <>
      <Container fluid>
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
                  }),
                }
              );
              if ((await response.json()).ok) {
                router.reload();
              }
              setIsLoading(false);
            }}
          >
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
                  return <option value={e}>{e}</option>;
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
                  type="text"
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
                  return <option value={e}>{e}</option>;
                })}
              </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit">
              {isLoading ? "Отправка..." : "📤 Представить"}
            </Button>
          </Form>
        ) : (
          <p>Загрузка...</p>
        )}
      </Container>
    </>
  );
});
