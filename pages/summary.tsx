import { useState } from "react";
import DefaultLayout from "@/layouts/default";
import { title, subtitle } from "@/components/primitives";

import { GetStaticPropsContext } from "next";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import moment from "moment";

import {
  Card,
  CardBody,
  Divider,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";

import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  ArcElement,
  Tooltip,
  Legend,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from "chart.js";
import currency from "currency.js";
import { Expense } from "./api/expense";

Chart.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
);

const fetcher = async (uri: string) => {
  const response = await fetch(uri);
  return response.json();
};

// Courtesy https://stackoverflow.com/a/23095818
function random_rgba() {
  var o = Math.round,
    r = Math.random,
    s = 255;
  return (
    "rgba(" + o(r() * s) + "," + o(r() * s) + "," + o(r() * s) + "," + 1 + ")"
  );
}

function getExpenseChartData(data?: any) {
  if (!data || !data.expenses)
    return {
      expensesByCategory: [],
      expensesByCard: [],
      expensesByPerson: [],
      expensesByMonth: [],
    };
  const expenses: Expense[] = data.expenses;
  const lookbackExpenses: { month: string; values: Expense[] }[] =
    data.lookback;
  const categories = new Set(
    expenses
      .map((e) => {
        return e.category;
      })
      .filter((c) => !!c),
  );
  const expensesByCategory: { category: string; sum: number }[] = [];
  categories.forEach((c) => {
    expensesByCategory.push({
      category: c,
      sum: expenses
        .filter((e) => e.category === c)
        .map((e) => e.cost)
        .reduce((a, b) => a + b, 0),
    });
  });

  const cards = new Set(
    expenses
      .map((e) => {
        return e.card;
      })
      .filter((c) => !!c),
  );
  const expensesByCard: { card: string; sum: number }[] = [];
  cards.forEach((c) => {
    expensesByCard.push({
      card: c,
      sum: expenses
        .filter((e) => e.card === c)
        .map((e) => e.cost)
        .reduce((a, b) => a + b, 0),
    });
  });

  const persons = new Set(
    expenses
      .map((e) => {
        return e.person;
      })
      .filter((p) => !!p),
  );
  const expensesByPerson: { person: string; sum: number }[] = [];
  persons.forEach((p) => {
    expensesByPerson.push({
      person: p,
      sum: expenses
        .filter((e) => e.person === p)
        .map((e) => e.cost)
        .reduce((a, b) => a + b, 0),
    });
  });

  let expensesByMonth: { month: string; sum: number }[] = [];
  expensesByMonth = [
    ...lookbackExpenses
      .map((e) => {
        return {
          month: e.month,
          sum: e.values.map((e) => e.cost).reduce((a, b) => a + b, 0),
        };
      })
      .reverse(),
    {
      month: data.month,
      sum: currency(data.total).value,
    },
  ];

  return {
    expensesByCategory,
    expensesByCard,
    expensesByPerson,
    expensesByMonth,
  };
}

function getLastMonthTotalDelta(expenseData: any) {
  if (expenseData.lastMonthTotal) {
    const total = currency(expenseData.total);
    const lastMonthTotal = currency(expenseData.lastMonthTotal);
    const delta = total.subtract(lastMonthTotal);
    let symbol = "🔹";
    if (delta.value > 0) {
      symbol = "🔺";
    } else {
      symbol = "🔻";
    }
    return `${symbol} ${delta.format()}`;
  }
  return "-";
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}

export default withPageAuthRequired(function Summary() {
  const t = useTranslations("Summary");

  const [month, setMonth] = useState(moment().format("MMM YY"));
  const {
    data: monthsData,
    error: monthsError,
    isLoading: monthsIsLoading,
  } = useSWR("/spend/api/expense/months", fetcher);
  const {
    data: expenseData,
    error: expenseError,
    isLoading: expenseIsLoading,
  } = useSWR(`/spend/api/expense?month=${month}&lookback=5`, fetcher);
  let {
    expensesByCategory,
    expensesByCard,
    expensesByPerson,
    expensesByMonth,
  } = getExpenseChartData(expenseData);

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center pb-4">
          <h1 className={title()}>📊 {t("title")}</h1>
        </div>
        <div className="text-center justify-center">
          <p>{t("contextUpper")}</p>
          <Select
            aria-label="month-selector"
            size="sm"
            className="max-w-xs"
            items={
              monthsIsLoading
                ? [{ value: month, label: month }]
                : monthsData["months"].map((m: string) => {
                    return { value: m, label: m };
                  })
            }
            disabled={monthsIsLoading && expenseIsLoading}
            selectedKeys={[month]}
            onChange={(event) => {
              setMonth(event.target.value);
            }}
          >
            {(month: { value: string; label: string }) => {
              return <SelectItem key={month.value}>{month.label}</SelectItem>;
            }}
          </Select>
          <p>{t("contextLower")}</p>
          {!expenseIsLoading && expenseData ? (
            <>
              <div className="py-3">
                <span
                  className={title({
                    size: "sm",
                  })}
                >
                  {expenseData.total}
                </span>
              </div>
              <p>
                {getLastMonthTotalDelta(expenseData)}
                <br />
                {t("contextSince")}
              </p>
            </>
          ) : (
            <h2 className={subtitle()}>{t("loading")}...</h2>
          )}
        </div>
        <Divider />
        {!expenseIsLoading && expenseData ? (
          <>
            <div className="w-full gap-4 grid grid-cols-1 lg:grid-cols-2">
              <Card className="col-span-1">
                <CardBody>
                  <div style={{ display: "block", height: "40vh" }}>
                    <Line
                      options={{ maintainAspectRatio: false }}
                      data={{
                        labels: expensesByMonth.map((e) => e.month),
                        datasets: [
                          {
                            label: "Total",
                            data: expensesByMonth.map((e) => e.sum),
                            borderColor: random_rgba(),
                            fill: false,
                            tension: 0.1,
                          },
                        ],
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
              <Card className="col-span-1">
                <CardBody>
                  <div style={{ display: "block", height: "40vh" }}>
                    <Doughnut
                      options={{
                        plugins: {
                          legend: {
                            position: "bottom",
                          },
                        },
                        maintainAspectRatio: false,
                      }}
                      data={{
                        labels: expensesByPerson.map((e) => e.person),
                        datasets: [
                          {
                            data: expensesByPerson.map((e) => e.sum),
                            backgroundColor: expensesByPerson.map((_e) => {
                              return random_rgba();
                            }),
                          },
                        ],
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
              <Card className="col-span-1 lg:col-span-2">
                <CardBody>
                  <div style={{ display: "block", height: "40vh" }}>
                    <Doughnut
                      options={{
                        plugins: {
                          legend: {
                            position: "bottom",
                          },
                        },
                        maintainAspectRatio: false,
                      }}
                      data={{
                        labels: expensesByCategory.map((e) => e.category),
                        datasets: [
                          {
                            data: expensesByCategory.map((e) => e.sum),
                            backgroundColor: expensesByCategory.map((_e) => {
                              return random_rgba();
                            }),
                          },
                        ],
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
              <Card className="col-span-1 lg:col-span-2">
                <CardBody>
                  <div style={{ display: "block", height: "40vh" }}>
                    <Bar
                      options={{ maintainAspectRatio: false }}
                      data={{
                        labels: expensesByCard.map((e) => e.card),
                        datasets: [
                          {
                            label: "Cards",
                            data: expensesByCard.map((e) => e.sum),
                            backgroundColor: random_rgba(),
                          },
                        ],
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="w-full gap-4 grid grid-cols-1">
              <Table
                className="col-span-12 sm:col-span-12"
                aria-label="expenses-table"
              >
                <TableHeader>
                  <TableColumn>{t("tableDate")}</TableColumn>
                  <TableColumn>{t("tableItem")}</TableColumn>
                  <TableColumn>{t("tableCategory")}</TableColumn>
                  <TableColumn>{t("tableAmount")}</TableColumn>
                  <TableColumn>{t("tableMethod")}</TableColumn>
                  <TableColumn>{t("tablePerson")}</TableColumn>
                </TableHeader>
                <TableBody>
                  {expenseData && expenseData.expenses ? (
                    expenseData.expenses.map((e: Expense, index: number) => {
                      return (
                        <TableRow key={index}>
                          <TableCell>{e.date}</TableCell>
                          <TableCell>{e.item}</TableCell>
                          <TableCell>{e.category}</TableCell>
                          <TableCell>{e.cost}</TableCell>
                          <TableCell>{e.card}</TableCell>
                          <TableCell>{e.person}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <></>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <Spinner />
        )}
      </section>
    </DefaultLayout>
  );
});
