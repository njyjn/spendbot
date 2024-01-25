import React, { useState } from "react";
import DefaultLayout from "@/layouts/default";
import { title } from "@/components/primitives";
import { GetStaticPropsContext } from "next";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import {
  Button,
  Modal,
  ModalFooter,
  ModalHeader,
  ModalContent,
  Select,
  SelectItem,
  Switch,
  Input,
} from "@nextui-org/react";
import { useUser, withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import moment from "moment";
import { Expense } from "./api/expense";

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
  const [person, setPerson] = useState(user.user!.name || "");
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
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center pb-4">
          <h1 className={title()}>🧮 {t("title")}</h1>
        </div>
        <Modal placement="center" isOpen={isSuccess} hideCloseButton>
          <ModalContent>
            <ModalHeader>✅ {t("formSubmitSuccess")}</ModalHeader>
            <ModalFooter>
              <Button
                onClick={() => {
                  setIsSuccess(false);
                  router.reload();
                }}
                color="primary"
              >
                🔙 {t("formSubmitSuccessBack")}
              </Button>
              <Button
                onClick={() => {
                  setIsSuccess(false);
                  router.push("/summary");
                }}
                color="secondary"
              >
                📊 {t("formSubmitSuccessGoToSummary")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        <div className="gap-2 grid grid-rows-2">
          <form
            className="row-span-12"
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
            <Switch isSelected={isOffset} onValueChange={setIsOffset}>
              {t("formIsCompensation")}
            </Switch>
            <div id="offsets" hidden={!isOffset}>
              <div className="gap-2 grid grid-cols-12 grid-rows-2 py-3">
                <Select
                  className="col-span-12"
                  label={`💁 ${t("formItem")}`}
                  isLoading={!expenses}
                  isRequired={isOffset}
                  size="sm"
                  selectionMode="single"
                  items={
                    !expenses
                      ? []
                      : expenses["expenses"].map((e: Expense, i: number) => {
                          return {
                            value: i,
                            label: [
                              e.date,
                              e.item,
                              e.cost,
                              e.category,
                              e.card,
                              e.person,
                            ].join(" - "),
                          };
                        })
                  }
                  onChange={(event) => {
                    setOffsetExpense(parseInt(event.target.value));
                  }}
                >
                  {(item: { value: string; label: string }) => {
                    return (
                      <SelectItem key={item.value}>{item.label}</SelectItem>
                    );
                  }}
                </Select>
                <Input
                  className="col-span-12"
                  label={t("formInputCompensationAmount")}
                  isRequired={isOffset}
                  step={0.1}
                  type="number"
                  placeholder="0.00"
                  startContent={
                    <div className="pointer-events-none flex items-center">
                      <span className="text-default-400 text-small">-</span>
                      <span className="text-default-400 text-small">SGD</span>
                    </div>
                  }
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
                />
              </div>
            </div>
            <div id="offsets" hidden={isOffset}>
              <div className="gap-2 grid grid-cols-12 grid-rows-6 py-3">
                <Select
                  label={`🧍 ${t("formPerson")}`}
                  isRequired={!isOffset}
                  className="col-span-12"
                  isLoading={!definitions}
                  disabled={isLoading}
                  items={
                    !definitions
                      ? []
                      : definitions["persons"].map((e: string, i: number) => {
                          return { value: e };
                        })
                  }
                  onChange={(event) => {
                    setPerson(event.target.value);
                  }}
                  selectedKeys={definitions ? [person] : []}
                >
                  {(item: { value: string }) => {
                    return (
                      <SelectItem key={item.value}>{item.value}</SelectItem>
                    );
                  }}
                </Select>
                <Input
                  className="col-span-12"
                  label={`📆 ${t("formDate")}`}
                  type="date"
                  onChange={(event) => setDate(new Date(event.target.value))}
                  defaultValue={date.toDateString()}
                />
                <Input
                  className="col-span-12"
                  label={`💁 ${t("formItem")}`}
                  isRequired={!isOffset}
                  onChange={(event) => setItem(event.target.value)}
                />
                <Select
                  label={`📦 ${t("formCategory")}`}
                  isRequired={!isOffset}
                  className="col-span-12"
                  isLoading={!definitions}
                  disabled={isLoading}
                  items={
                    !definitions
                      ? []
                      : definitions["categories"].map(
                          (e: string, i: number) => {
                            return { value: e };
                          },
                        )
                  }
                  onChange={(event) => {
                    setCategory(event.target.value);
                  }}
                >
                  {(item: { value: string }) => {
                    return (
                      <SelectItem key={item.value}>{item.value}</SelectItem>
                    );
                  }}
                </Select>
                <Input
                  className="col-span-12"
                  label={`💰 ${t("formAmount")}`}
                  isRequired={!isOffset}
                  step={0.1}
                  type="number"
                  placeholder="0.00"
                  endContent={
                    <div className="flex items-center">
                      <label className="sr-only" htmlFor="currency">
                        Currency
                      </label>
                      <select
                        className="outline-none border-0 bg-transparent text-default-400 text-small"
                        id="currency"
                        name="currency"
                        onChange={(event) => {
                          setCostCurrency(event.target.value);
                        }}
                      >
                        {definitions
                          ? definitions["fx"].map(
                              (f: { currency: string; rate: number }) => {
                                return (
                                  <option key={f.currency}>{f.currency}</option>
                                );
                              },
                            )
                          : []}
                      </select>
                    </div>
                  }
                  onChange={(event) => {
                    let cost = parseFloat(event.target.value).toFixed(2);
                    setCost(cost);
                  }}
                  description={
                    costCurrency !== "SGD"
                      ? t("formInputHelpCurrency", {
                          costCurrency: costCurrency,
                          costCurrencyValue:
                            definitions["fx"].find(
                              (f: { currency: string; rate: number }) =>
                                f.currency === costCurrency,
                            )?.rate || "?",
                          asOf: moment().format("LLL"),
                        })
                      : ""
                  }
                />
                <Select
                  label={`💳 ${t("formMethod")}`}
                  isRequired={!isOffset}
                  className="col-span-12"
                  isLoading={!definitions}
                  disabled={isLoading}
                  items={
                    !definitions
                      ? []
                      : definitions["cards"].map((e: string) => {
                          return { value: e };
                        })
                  }
                  onChange={(event) => {
                    setCard(event.target.value);
                  }}
                >
                  {(item: { value: string }) => {
                    return (
                      <SelectItem key={item.value}>{item.value}</SelectItem>
                    );
                  }}
                </Select>
              </div>
            </div>
            <Button
              className="mt-3"
              style={{ width: "100%" }}
              color="success"
              type="submit"
            >
              {isLoading ? t("formSubmitLoading") : `➕ ${t("formSubmit")}`}
            </Button>
          </form>
          <div className="row-span-12 center">
            <p className="text-center">⚠️ {t("formHelpEdits")}</p>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
});
