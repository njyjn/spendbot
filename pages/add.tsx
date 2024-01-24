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
import { useUser, withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import moment from "moment";
import { Expense } from "./api/expense";
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
  const user = useUser();
  const t = useTranslations("Add");

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
    fetcher,
  );
  const { data: expenses, error: expensesError } = useSWR(
    `/spend/api/expense?month=${month}`,
    fetcher,
  );

  return (
    <>
      <Container fluid>
        <Modal centered show={isSuccess}>
          <Modal.Body className="text-center">
            <p>✅ {t("formSubmitSuccess")}</p>
            <Button
              className="mr-1"
              onClick={() => {
                setIsSuccess(false);
                router.reload();
              }}
              variant="primary"
            >
              🔙 {t("formSubmitSuccessBack")}
            </Button>
            <Button
              className="ml-1"
              onClick={() => {
                setIsSuccess(false);
                router.push("/summary");
              }}
              variant="secondary"
            >
              📊 {t("formSubmitSuccessGoToSummary")}
            </Button>
          </Modal.Body>
        </Modal>
        <h1 className="text-center">🧮 {t("title")}</h1>
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
                },
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
                label={t("formIsCompensation")}
                onChange={() => {
                  setIsOffset(!isOffset);
                }}
              ></Form.Check>
            </Form.Group>
            <Form.Group hidden={!isOffset} className="mb-3">
              <Form.Label htmlFor="expense">💁 {t("formItem")}</Form.Label>
              <Form.Select
                id="expense"
                name="expense"
                required={isOffset}
                onChange={(event) =>
                  setOffsetExpense(parseInt(event.target.value))
                }
              >
                <option value={undefined}>
                  {t("formSelectCompensationItem")}
                </option>
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
                  placeholder={t("formInputCompensationAmount")}
                ></Form.Control>
              </InputGroup>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label htmlFor="person">🧍 {t("formPerson")}</Form.Label>
              <Form.Select
                id="person"
                name="person"
                required={!isOffset}
                onChange={(event) => setPerson(event.target.value)}
              >
                <option value={undefined}>{t("formSelectPerson")}</option>
                {definitions["persons"].map((e: string) => {
                  return (
                    <option
                      key={"Person." + e}
                      value={e}
                      selected={user.user?.name === e}
                    >
                      {e}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label htmlFor="date">📆 {t("formDate")}</Form.Label>
              <Form.Control
                id="date"
                name="date"
                type="date"
                defaultValue={date.toDateString()}
                onChange={(event) => setDate(new Date(event.target.value))}
              ></Form.Control>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label htmlFor="item">💁 {t("formItem")}</Form.Label>
              <Form.Control
                id="item"
                name="item"
                required={!isOffset}
                type="text"
                onChange={(event) => setItem(event.target.value)}
                placeholder={t("formInputItem")}
              ></Form.Control>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label htmlFor="category">📦 {t("formCategory")}</Form.Label>
              <Form.Select
                id="category"
                name="category"
                required={!isOffset}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value={undefined}>{t("formSelectCategory")}</option>
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
              <Form.Label htmlFor="cost">💰 {t("formAmount")}</Form.Label>
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
                    },
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
                  placeholder={t("formInputAmount")}
                ></Form.Control>
              </InputGroup>
              <Form.Text muted>
                {costCurrency !== "SGD"
                  ? t("formInputHelpCurrency", {
                      costCurrency: costCurrency,
                      costCurrencyValue:
                        definitions["fx"].find(
                          (f: { currency: string; rate: number }) =>
                            f.currency === costCurrency,
                        )?.rate || "?",
                      asOf: moment().format("LLL"),
                    })
                  : ""}
              </Form.Text>
            </Form.Group>
            <Form.Group hidden={isOffset} className="mb-3">
              <Form.Label htmlFor="card">💳 {t("formMethod")}</Form.Label>
              <Form.Select
                id="card"
                name="card"
                required={!isOffset}
                onChange={(event) => setCard(event.target.value)}
              >
                <option value={undefined}>{t("formSelectMethod")}</option>
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
              {isLoading ? t("formSubmitLoading") : `➕ ${t("formSubmit")}`}
            </Button>
          </Form>
        ) : (
          <p>{t("loading")}</p>
        )}
        <p className="mt-3 text-center">⚠️ {t("formHelpEdits")}</p>
      </Container>
    </>
  );
});
