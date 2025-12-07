import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { GetStaticPropsContext } from "next";
import { useTranslations } from "next-intl";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import useSWR from "swr";
import { useState } from "react";
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
import annotationPlugin from "chartjs-plugin-annotation";
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Button,
} from "@nextui-org/react";

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
  annotationPlugin,
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
  const [annualSpending, setAnnualSpending] = useState<number | null>(120000);

  // FIRE calculation: 4% rule - if you need $X/year, you need $X/0.04 = $25X in assets
  const fireNumber = annualSpending ? annualSpending / 0.04 : null;
  const yearsToFire =
    fireNumber && data?.tia
      ? Math.max(0, (fireNumber - data.tia) / (annualSpending || 1))
      : null;

  // Monthly investment calculation (future value of a series)
  // FV = PMT * [((1 + r)^n - 1) / r]
  // PMT = (fireNumber - data?.tia) / (((1 + r)^n - 1) / r)
  const annualReturn = 0.07;
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const monthsToFire = yearsToFire ? Math.max(0, yearsToFire * 12) : null;
  let monthlyInvestment: number | null = null;
  if (fireNumber && data?.tia && monthsToFire && monthsToFire > 0) {
    const fvFactor =
      (Math.pow(1 + monthlyReturn, monthsToFire) - 1) / monthlyReturn;
    monthlyInvestment = (fireNumber - data.tia) / fvFactor;
  }

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 w-full">
        <div className="inline-block w-full text-center justify-center pb-4">
          <h1 className={title()}>💰 {t("title")}</h1>
        </div>
        <div className="text-center justify-center w-full">
          {!isLoading && data ? (
            <>
              <p>
                {t("context", {
                  month: month,
                })}
              </p>
              <h1
                className={title({
                  size: "sm",
                })}
              >
                $
                {data.total.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </h1>
              <p className="text-xl font-semibold mt-2">
                TIA (Total Investable Assets): $
                {data.tia.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </p>
            </>
          ) : (
            <p>{t("loading")}</p>
          )}
        </div>
        <Divider />

        {/* FIRE Calculator */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="w-full">
            <CardHeader className="flex flex-col items-start px-4 py-2">
              <h3 className="text-lg font-semibold">🔥 FIRE Calculator</h3>
              <p className="text-sm text-default-500">
                Using 4% withdrawal rule
              </p>
            </CardHeader>
            <CardBody className="gap-4">
              <div>
                <Input
                  type="number"
                  label="Annual Spending ($)"
                  placeholder="50000"
                  value={annualSpending?.toString() || ""}
                  onValueChange={(val) =>
                    setAnnualSpending(val ? parseFloat(val) : null)
                  }
                  startContent={<span className="text-default-400">$</span>}
                />
              </div>
              {fireNumber && data?.tia && (
                <div className="space-y-3 p-3 bg-default-100/50 rounded-lg">
                  <div>
                    <p className="text-sm text-default-500">
                      FIRE Number (needed):
                    </p>
                    <p className="text-lg font-bold">
                      $
                      {fireNumber.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-default-500">Current TIA:</p>
                    <p className="text-lg font-bold">
                      $
                      {data.tia.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <Divider />
                  <div>
                    <p className="text-sm text-default-500">Progress:</p>
                    <p className="text-lg font-bold">
                      {((data.tia / fireNumber) * 100).toFixed(1)}%
                    </p>
                  </div>
                  {yearsToFire !== null && (
                    <div>
                      <p className="text-sm text-default-500">
                        Years to FIRE (at current rate):
                      </p>
                      <p
                        className={`text-lg font-bold ${yearsToFire <= 0 ? "text-green-600" : "text-blue-600"}`}
                      >
                        {yearsToFire <= 0
                          ? "🎉 Already there!"
                          : `${yearsToFire.toFixed(1)} years`}
                      </p>
                    </div>
                  )}
                  {monthlyInvestment !== null &&
                    yearsToFire !== null &&
                    monthsToFire &&
                    monthsToFire > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-default-100/50">
                        <p className="text-sm text-default-500">
                          To reach your FIRE goal in{" "}
                          <span className="font-bold">
                            {yearsToFire.toFixed(1)} years
                          </span>
                          , you need to invest:
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          $
                          {monthlyInvestment.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          per month
                        </p>
                        <p className="text-xs text-default-400 mt-1">
                          Assumes 7% annual return, compounded monthly. Actual
                          results may vary.
                        </p>
                      </div>
                    )}
                </div>
              )}
              {fireNumber && (
                <p className="text-xs text-default-400 text-center">
                  * Assumes 7% annual return. With $
                  {annualSpending?.toLocaleString()}/year spending, you need $
                  {fireNumber.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  to retire safely.
                </p>
              )}
            </CardBody>
          </Card>
          {/* FIRE Growth Graph */}
          <Card className="w-full">
            <CardHeader className="flex flex-col items-start px-4 py-2">
              <h3 className="text-lg font-semibold">
                Projected Portfolio Growth
              </h3>
              <p className="text-sm text-default-500">
                Until FIRE goal is reached
              </p>
            </CardHeader>
            <CardBody>
              {fireNumber && data?.tia && monthsToFire && monthsToFire > 0 && (
                <div
                  style={{
                    display: "block",
                    height: "40vh",
                    minHeight: "300px",
                  }}
                >
                  <Line
                    key={`fire-line-${monthsToFire}-${fireNumber}-${data?.tia}`}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: true },
                        ...(fireNumber && monthsToFire
                          ? {
                              annotation: {
                                annotations: {
                                  fireGoal: {
                                    type: "line",
                                    yMin: fireNumber,
                                    yMax: fireNumber,
                                    borderColor: "#f59e42",
                                    borderWidth: 2,
                                    borderDash: [6, 6],
                                    label: {
                                      display: true,
                                      content: "FIRE Goal",
                                      position: "start",
                                      color: "#f59e42",
                                      backgroundColor: "rgba(0,0,0,0.7)",
                                    },
                                  },
                                },
                              },
                            }
                          : {}),
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: "Portfolio Value ($)" },
                        },
                        x: {
                          title: { display: true, text: "Month" },
                        },
                      },
                    }}
                    data={{
                      labels: Array.from(
                        { length: monthsToFire + 1 },
                        (_, i) => `Month ${i}`,
                      ),
                      datasets: [
                        {
                          label: "Cumulative Savings",
                          data: (() => {
                            let values = [];
                            let current = data.tia;
                            for (let i = 0; i <= monthsToFire; i++) {
                              values.push(
                                current + i * (monthlyInvestment || 0),
                              );
                            }
                            return values;
                          })(),
                          borderColor: "#22c55e",
                          backgroundColor: "rgba(34,197,94,0.3)",
                          fill: "origin",
                          pointRadius: 0,
                        },
                        {
                          label: "Cumulative Returns",
                          data: (() => {
                            let values = [];
                            let current = data.tia;
                            for (let i = 0; i <= monthsToFire; i++) {
                              values.push(current);
                              current =
                                current * (1 + monthlyReturn) +
                                (monthlyInvestment || 0);
                            }
                            return values;
                          })(),
                          borderColor: "#2563eb",
                          backgroundColor: "rgba(37,99,235,0.3)",
                          fill: "origin",
                          pointRadius: 0,
                        },
                      ],
                    }}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Divider />
        {!isLoading && data ? (
          <>
            {!data.allocations || data.allocations.length === 0 ? (
              <Card className="w-full max-w-2xl">
                <CardBody>
                  <p className="text-red-600">
                    Error: No allocations data received
                  </p>
                  <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-64">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </CardBody>
              </Card>
            ) : (
              <div className="w-full gap-4 grid grid-cols-1 lg:grid-cols-2">
                <Card className="col-span-1">
                  <CardBody>
                    <h3 className="text-lg font-semibold mb-4">
                      Portfolio Breakdown
                    </h3>
                    <div
                      style={{
                        display: "block",
                        height: "60vh",
                        minHeight: "400px",
                      }}
                    >
                      <Doughnut
                        options={{
                          plugins: {
                            legend: {
                              position: "right",
                            },
                          },
                          maintainAspectRatio: false,
                        }}
                        data={{
                          labels: data.allocations.map(
                            (a: any) =>
                              `${a.allocation} ($${a.value.toLocaleString("en-US", { maximumFractionDigits: 0 })})`,
                          ),
                          datasets: [
                            {
                              data: data.allocations.map((a: any) => a.value),
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
                  </CardBody>
                </Card>

                <Card className="col-span-1">
                  <CardBody>
                    <h3 className="text-lg font-semibold mb-4">
                      Allocation vs Target
                    </h3>
                    <div
                      style={{
                        display: "block",
                        height: "60vh",
                        minHeight: "400px",
                      }}
                    >
                      <Bar
                        options={{
                          maintainAspectRatio: false,
                          indexAxis: "y",
                          scales: {
                            x: {
                              stacked: false,
                              max: 100,
                            },
                            y: {
                              stacked: false,
                              ticks: {
                                mirror: true,
                              },
                            },
                          },
                          plugins: {
                            legend: {
                              display: true,
                            },
                          },
                        }}
                        data={{
                          labels: data.allocations.map(
                            (a: any) => a.allocation,
                          ),
                          datasets: [
                            {
                              label: "Current (%)",
                              data: data.allocations.map((a: any) =>
                                (a.absolute * 100).toFixed(1),
                              ),
                              backgroundColor: "rgba(75, 192, 192, 0.7)",
                            },
                            {
                              label: "Target (%)",
                              data: data.allocations.map((a: any) =>
                                (a.target * 100).toFixed(1),
                              ),
                              backgroundColor: "rgba(255, 99, 132, 0.7)",
                            },
                          ],
                        }}
                      />
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}
          </>
        ) : (
          t("loading")
        )}
      </section>
    </DefaultLayout>
  );
});
