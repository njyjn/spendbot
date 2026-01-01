import { useState } from "react";
import DefaultLayout from "@/layouts/default";
import { title, subtitle } from "@/components/primitives";

import { GetServerSidePropsContext } from "next";
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

import { withPageAuthRequired } from "@auth0/nextjs-auth0";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import currency from "currency.js";
import type { Expense } from "./api/expense";

const fetcher = async (uri: string) => {
  const response = await fetch(uri);
  return response.json();
};

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

export const getServerSideProps = withPageAuthRequired({
  async getServerSideProps(context: GetServerSidePropsContext) {
    return {
      props: {
        messages: (await import(`../messages/${context.locale}.json`)).default,
      },
    };
  },
});

const chartColors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
];

export default function Summary() {
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
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={expensesByMonth}
                      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis
                        stroke="#6b7280"
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value) =>
                          `$${Number(value).toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}`
                        }
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sum"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                        name="Total"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
              <Card className="col-span-1">
                <CardBody>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expensesByPerson.map((e) => ({
                          name: e.person,
                          value: e.sum,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => {
                          const total = expensesByPerson.reduce(
                            (sum: number, item: any) => sum + item.sum,
                            0,
                          );
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${name}: ${percentage}%`;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expensesByPerson.map((_: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          `$${Number(value).toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}`
                        }
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
              <Card className="col-span-1 lg:col-span-2">
                <CardBody>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expensesByCategory.map((e) => ({
                          name: e.category,
                          value: e.sum,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => {
                          const total = expensesByCategory.reduce(
                            (sum: number, item: any) => sum + item.sum,
                            0,
                          );
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${name}: ${percentage}%`;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expensesByCategory.map((_: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          `$${Number(value).toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}`
                        }
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
              <Card className="col-span-1 lg:col-span-2">
                <CardBody>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={expensesByCard.map((e) => ({
                        name: e.card,
                        sum: e.sum,
                      }))}
                      margin={{ top: 5, right: 30, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis
                        stroke="#6b7280"
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value) =>
                          `$${Number(value).toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}`
                        }
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="sum"
                        fill="#10b981"
                        name="Cards"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
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
}
