import React, { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import {
  Button,
  Container,
  Dropdown,
  DropdownButton,
  Form,
  InputGroup,
  Modal,
} from "react-bootstrap";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import moment from "moment";
import { Expense } from "./api/expense";

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
  const [cost, setCost] = useState("0.0");
  const [costCurrency, setCostCurrency] = useState("SGD");
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
              let costAfterConversion = cost;
              if (!isOffset && costCurrency !== "SGD") {
                const rate = (
                  definitions["fx"] as { currency: string; rate: number }[]
                ).find((f) => f.currency === costCurrency)?.rate;
                if (rate) {
                  costAfterConversion = (
                    (parseFloat(cost) * 1.0) /
                    rate
                  ).toFixed(2);
                }
              }
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
                    cost: costAfterConversion,
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
              <Form.Label htmlFor="expense">💸 Расход</Form.Label>
              <Form.Select
                id="expense"
                name="expense"
                required={isOffset}
                onChange={(event) =>
                  setOffsetExpense(parseInt(event.target.value))
                }
              >
                <option value={undefined}>Выберите расход...</option>
                {expenses["expenses"].map((e: Expense, index: number) => {
                  return (
                    <option key={"Expense." + index} value={index}>
                      {[
                        e.date,
                        e.item,
                        e.cost,
                        e.category,
                        e.card,
                        e.person,
                      ].join(" - ")}
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
                    const expense: Expense =
                      expenses["expenses"].at(offsetExpense);
                    setDate(moment(expense.date, "l").toDate());
                    setItem("Offset - " + expense.item);
                    setCategory(expense.category);
                    setCost((-1.0 * parseFloat(event.target.value)).toFixed(2));
                    setCard("");
                    setPerson(expense.person);
                  }}
                  placeholder="Введите сумму..."
                ></Form.Control>
              </InputGroup>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label htmlFor="person">🧍 Человек</Form.Label>
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
              <Form.Label htmlFor="date">📆 Дату</Form.Label>
              <Form.Control
                id="date"
                name="date"
                type="date"
                defaultValue={date.toDateString()}
                onChange={(event) => setDate(new Date(event.target.value))}
              ></Form.Control>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label htmlFor="item">💁 Расход</Form.Label>
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
              <Form.Label htmlFor="category">📦 Категория</Form.Label>
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
              <Form.Label htmlFor="cost">💰 Сумма</Form.Label>
              <InputGroup className="mb-2">
                <DropdownButton
                  variant="outline-secondary"
                  title={costCurrency}
                >
                  {definitions["fx"].map(
                    (f: { currency: string; rate: number }) => {
                      return (
                        <Dropdown.Item
                          key={f.currency}
                          onClick={() => setCostCurrency(f.currency)}
                        >
                          {f.currency}
                        </Dropdown.Item>
                      );
                    }
                  )}
                </DropdownButton>
                <Form.Control
                  id="cost"
                  name="cost"
                  required={!isOffset}
                  type="number"
                  step={0.01}
                  onChange={(event) => {
                    let cost = parseFloat(event.target.value).toFixed(2);
                    setCost(cost);
                  }}
                  placeholder="Введите сумму..."
                ></Form.Control>
              </InputGroup>
              <Form.Text muted>
                {costCurrency !== "SGD"
                  ? `SGD 1 ≈ ${costCurrency} ${
                      definitions["fx"].find(
                        (f: { currency: string; rate: number }) =>
                          f.currency === costCurrency
                      )?.rate || "?"
                    } по состоянию на ${moment().format(
                      "LLL"
                    )}. Стоимость будет конвертирована в SGD при подаче заявки.`
                  : ""}
              </Form.Text>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label htmlFor="card">💳 Карта</Form.Label>
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
