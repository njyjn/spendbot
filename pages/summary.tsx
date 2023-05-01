import { Col, Container, Row } from "react-bootstrap";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import useSWR from "swr";
import moment from "moment";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  ArcElement,
  Tooltip,
  Legend,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";

Chart.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface Expense {
  date: string;
  item: string;
  category: string;
  cost: number;
  card: string;
  person: string;
}

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
    };
  const expenses: Expense[] = data.expenses.map((e: any[]) => {
    return {
      date: e[0],
      item: e[1],
      category: e[2],
      cost: e[3],
      card: e[4],
      person: e[5],
    } as Expense;
  });

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

  return { expensesByCategory, expensesByCard, expensesByPerson };
}

export default withPageAuthRequired(function Summary() {
  const month = moment().format("MMM YY");
  const { data, error, isLoading } = useSWR(
    `/spend/api/expense?month=${month}`,
    fetcher
  );
  let { expensesByCategory, expensesByCard, expensesByPerson } =
    getExpenseChartData(data);

  return (
    <>
      <Container fluid className="text-center center">
        <h1>📊 Сводка</h1>
        <p>в {month} года вы все потратили</p>
        {!isLoading && data ? (
          <>
            <h2>{data.total}</h2>
            <Row className="py-3">
              <Col sm></Col>
              <Col sm>
                <Bar
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
                ></Bar>
              </Col>
              <Col sm></Col>
            </Row>
            <Row className="py-3">
              <Col sm />
              <Col sm>
                <Doughnut
                  options={{
                    plugins: {
                      legend: {
                        position: "bottom",
                      },
                    },
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
              </Col>
              <Col sm>
                <Doughnut
                  options={{
                    plugins: {
                      legend: {
                        position: "bottom",
                      },
                    },
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
              </Col>
              <Col sm />
            </Row>
          </>
        ) : (
          "Загрузка..."
        )}
      </Container>
    </>
  );
});
