import {
  Card,
  Col,
  Container,
  Dropdown,
  DropdownButton,
  Row,
  Table,
} from "react-bootstrap";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import useSWR from "swr";
import moment from "moment";
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
import { Expense } from "./api/expense";
import { useState } from "react";
import currency from "currency.js";

Chart.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
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
      .filter((c) => !!c)
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
      .filter((c) => !!c)
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
      .filter((p) => !!p)
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
    return (
      <>
        {symbol} {delta.format()}
        <br />с прошлого месяца
      </>
    );
  }
  return "-";
}

export default withPageAuthRequired(function Summary() {
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
    <>
      <Container fluid className="text-center center">
        <h1>📊 Сводка</h1>
        <Row className="g-4">
          <Col sm={12}>
            <Card>
              <Card.Body>
                <p>
                  в{" "}
                  <DropdownButton
                    id="dropdown-month-selector"
                    title={month}
                    variant="light"
                    disabled={expenseIsLoading}
                    onSelect={(e) => {
                      if (e) {
                        setMonth(e);
                      }
                    }}
                  >
                    {!monthsIsLoading && monthsData && monthsData["months"] ? (
                      monthsData["months"].map((m: string) => (
                        <Dropdown.Item key={m} eventKey={m}>
                          {m}
                        </Dropdown.Item>
                      ))
                    ) : (
                      <></>
                    )}
                  </DropdownButton>{" "}
                  года было потрачено
                </p>
                <p></p>
                {!expenseIsLoading && expenseData ? (
                  <>
                    <h2>{expenseData.total}</h2>
                    <p>{getLastMonthTotalDelta(expenseData)}</p>
                  </>
                ) : (
                  <h2>Загрузка...</h2>
                )}
              </Card.Body>
            </Card>
          </Col>
          {!expenseIsLoading && expenseData ? (
            <>
              <Col sm={12}>
                <Card>
                  <Card.Body>
                    <div style={{ display: "block", height: "25vh" }}>
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
                  </Card.Body>
                </Card>
              </Col>
              <Col sm={12}>
                <Card>
                  <Card.Body>
                    <div style={{ display: "block", height: "25vh" }}>
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
                  </Card.Body>
                </Card>
              </Col>
              <Col sm={6}>
                <Card>
                  <Card.Body>
                    <div style={{ display: "block", height: "25vh" }}>
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
                  </Card.Body>
                </Card>
              </Col>
              <Col sm={6}>
                <Card>
                  <Card.Body>
                    <div style={{ display: "block", height: "25vh" }}>
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
                  </Card.Body>
                </Card>
              </Col>
              <Col sm={12}>
                <Table responsive striped bordered hover>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Товар</th>
                      <th>Категория</th>
                      <th>Стоимость</th>
                      <th>Карточка</th>
                      <th>Персона</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseData && expenseData.expenses ? (
                      expenseData.expenses.map((e: Expense, index: number) => {
                        return (
                          <tr key={index}>
                            <td>{e.date}</td>
                            <td>{e.item}</td>
                            <td>{e.category}</td>
                            <td>{e.cost}</td>
                            <td>{e.card}</td>
                            <td>{e.person}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <></>
                    )}
                  </tbody>
                </Table>
              </Col>
            </>
          ) : (
            <></>
          )}
        </Row>
      </Container>
    </>
  );
});
