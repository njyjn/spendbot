import { Card, Col, Container, Row } from "react-bootstrap";
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
import { Allocation, Goal } from "./api/networth";
import { GetStaticPropsContext } from "next";
import { useTranslations } from "next-intl";

Chart.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
);

const fetcher = async (uri: string) => {
  const response = await fetch(uri);
  return response.json();
};

// Courtesy https://stackoverflow.com/a/23095818
function random_rgba(transparency: number = 1) {
  var o = Math.round,
    r = Math.random,
    s = 255;
  return (
    "rgba(" +
    o(r() * s) +
    "," +
    o(r() * s) +
    "," +
    o(r() * s) +
    "," +
    transparency +
    ")"
  );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}

export default withPageAuthRequired(function Overview() {
  const month = moment().format("MMM YY");
  const { data, error, isLoading } = useSWR(`/spend/api/networth`, fetcher);
  const t = useTranslations("Networth");
  return (
    <>
      <Container fluid className="text-center center">
        <h1>💰 {t("title")}</h1>
        {!isLoading && data ? (
          <>
            <Row className="g-4">
              <Col sm={12}>
                <Card>
                  <Card.Body>
                    <p>
                      {t("context", {
                        month: month,
                      })}
                    </p>
                    <h2>{data.total}</h2>
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
                          labels: data.allocations.map(
                            (a: Allocation) => a.allocation,
                          ),
                          datasets: [
                            {
                              data: data.allocations.map(
                                (a: Allocation) => a.absolute * 100,
                              ),
                              backgroundColor: data.allocations.map(
                                (_a: any) => {
                                  return random_rgba();
                                },
                              ),
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
                          labels: data.allocations
                            .filter((a: Allocation) => {
                              return !!a.relative;
                            })
                            .map((a: Allocation) => a.allocation),
                          datasets: [
                            {
                              data: data.allocations.map(
                                (a: Allocation) => a.relative * 100,
                              ),
                              backgroundColor: data.allocations.map(
                                (_a: any) => {
                                  return random_rgba();
                                },
                              ),
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
                        options={{
                          maintainAspectRatio: false,
                          indexAxis: "y",
                          scales: {
                            y: {
                              ticks: {
                                mirror: true,
                              },
                            },
                          },
                        }}
                        data={{
                          labels: data.goals.map(
                            (g: Goal) => `${g.goal} (${g.value} / ${g.end})`,
                          ),
                          datasets: [
                            {
                              label: "Goals",
                              data: data.goals.map(
                                (g: Goal) => g.percent * 100,
                              ),
                              backgroundColor: data.goals.map((g: Goal) => {
                                if (g.percent >= 1)
                                  return "rgba(39,245,52,0.5)";
                                if (g.percent >= 0.5)
                                  return "rgba(245,232,39,0.5)";
                                if (g.percent >= 0)
                                  return "rgba(245,39,39,0.5)";
                              }),
                            },
                          ],
                        }}
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        ) : (
          t("loading")
        )}
      </Container>
    </>
  );
});
