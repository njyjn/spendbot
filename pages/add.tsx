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

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [isOffset, setIsOffset] = useState(false);
  const [offsetExpense, setOffsetExpense] = useState(-1);
  const [person, setPerson] = useState("");
  const [date, setDate] = useState(new Date(Date.now()));
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState(0);
  const [card, setCard] = useState("");

  const month = moment(date).format("MMM YY");

  const { data: definitions, error: definitionsError } = useSWR(
    "/spend/api/definitions",
    fetcher
  );
  const { data: expenses, error: expensesError } = useSWR(
    `/spend/api/expense?month=${month}`,
    fetcher
  );

  return (
    <>
      <Container fluid>
        <Modal centered show={isSuccess}>
          <Modal.Body className="text-center">
            <p>✅ Сделанный!</p>
            <Button
              className="mr-1"
              onClick={() => {
                setIsSuccess(false);
                router.reload();
              }}
              variant="primary"
            >
              🔙 Закрой
            </Button>
            <Button
              className="ml-1"
              onClick={() => {
                setIsSuccess(false);
                router.push("/summary");
              }}
              variant="secondary"
            >
              📊 Перейти к сводке
            </Button>
          </Modal.Body>
        </Modal>
        <h1 className="text-center">💸 Добавить</h1>
        {definitions && expenses ? (
          <Form
            onSubmit={async (event) => {
              event.preventDefault();
              setIsLoading(true);
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
              <Form.Check
                type="switch"
                id="isOffset"
                name="isOffset"
                label="Компенсировать?"
                onChange={() => {
                  setIsOffset(!isOffset);
                }}
              ></Form.Check>
            </Form.Group>
            <Form.Group hidden={!isOffset} className="mb-3">
              <Form.Label for="expense">💸 Расход</Form.Label>
              <Form.Select
                id="expense"
                name="expense"
                required={isOffset}
                onChange={(event) =>
                  setOffsetExpense(parseInt(event.target.value))
                }
              >
                <option value={undefined}>Выберите расход...</option>
                {expenses["expenses"]
                  .filter((e: any[]) => !!e[1])
                  .map((e: any[], index: number) => {
                    return (
                      <option key={"Expense." + index} value={index}>
                        {e.join(" - ")}alethea
                      </option>
                    );
                  })}
              </Form.Select>
            </Form.Group>
            <Form.Group hidden={!isOffset} className="mb-3">
              <InputGroup className="mb-2">
                <InputGroup.Text>-</InputGroup.Text>
                <InputGroup.Text>SGD</InputGroup.Text>
                <Form.Control
                  id="offsetCost"
                  name="offsetCost"
                  required={isOffset}
                  type="number"
                  step={0.01}
                  onChange={(event) => {
                    const expense = expenses["expenses"].at(offsetExpense);
                    setDate(moment(expense[0], "l").toDate());
                    setItem("Offset - " + expense[1]);
                    setCategory(expense[2]);
                    setCost(-1 * parseFloat(event.target.value));
                    setCard("");
                    setPerson(expense[5]);
                  }}
                  placeholder="Введите сумму..."
                ></Form.Control>
              </InputGroup>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label for="person">🧍 Человек</Form.Label>
              <Form.Select
                id="person"
                name="person"
                required={!isOffset}
                onChange={(event) => setPerson(event.target.value)}
              >
                <option value={undefined}>Выберите человека...</option>
                {definitions["persons"].map((e: string) => {
                  return (
                    <option key={"Person." + e} value={e}>
                      {e}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label for="date">📆 Дату</Form.Label>
              <Form.Control
                id="date"
                name="date"
                type="date"
                defaultValue={date.toDateString()}
                onChange={(event) => setDate(new Date(event.target.value))}
              ></Form.Control>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label for="item">💁 Расход</Form.Label>
              <Form.Control
                id="item"
                name="item"
                required={!isOffset}
                type="text"
                onChange={(event) => setItem(event.target.value)}
                placeholder="Введите название расхода..."
              ></Form.Control>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label for="category">📦 Категория</Form.Label>
              <Form.Select
                id="category"
                name="category"
                required={!isOffset}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value={undefined}>Выберите категорию...</option>
                {definitions["categories"].map((e: string) => {
                  return (
                    <option key={"Category." + e} value={e}>
                      {e}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label for="cost">💰 Сумма</Form.Label>
              <InputGroup className="mb-2">
                <InputGroup.Text>SGD</InputGroup.Text>
                <Form.Control
                  id="cost"
                  name="cost"
                  required={!isOffset}
                  type="number"
                  step={0.01}
                  onChange={(event) => setCost(parseFloat(event.target.value))}
                  placeholder="Введите сумму..."
                ></Form.Control>
              </InputGroup>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label for="card">💳 Карта</Form.Label>
              <Form.Select
                id="card"
                name="card"
                required={!isOffset}
                onChange={(event) => setCard(event.target.value)}
              >
                <option value={undefined}>Выберите карту...</option>
                {definitions["cards"].map((e: string) => {
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
        <p className="mt-3 text-center">
          ⚠️ Чтобы внести изменения, посетите Google Таблицу
        </p>
      </Container>
    </>
  );
});
