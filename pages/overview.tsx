import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { GetServerSidePropsContext } from "next";
import { useTranslations } from "next-intl";
import { withPageAuthRequired } from "@auth0/nextjs-auth0";
import useSWR from "swr";
import { useState } from "react";
import moment from "moment";
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
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Button,
} from "@nextui-org/react";

const fetcher = async (uri: string) => {
  const response = await fetch(uri);
  return response.json();
};

export const getServerSideProps = withPageAuthRequired({
  async getServerSideProps(context: GetServerSidePropsContext) {
    return {
      props: {
        messages: (await import(`../messages/${context.locale}.json`)).default,
      },
    };
  },
});

export default function Overview() {
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

  const projectionData = Array.from(
    { length: Math.min(monthsToFire ? monthsToFire + 1 : 0, 120) },
    (_, i) => {
      let current = data?.tia || 0;
      for (let j = 0; j < i; j++) {
        current = current * (1 + monthlyReturn) + (monthlyInvestment || 0);
      }
      return {
        month: i,
        cumulative: (data?.tia || 0) + i * (monthlyInvestment || 0),
        withReturns: current,
      };
    },
  );

  const pieData =
    data?.allocations?.map((a: any) => ({
      name: a.allocation,
      value: a.value,
    })) || [];

  const barData =
    data?.allocations?.map((a: any) => ({
      name: a.allocation,
      Current: parseFloat((a.absolute * 100).toFixed(1)),
      Target: parseFloat((a.target * 100).toFixed(1)),
    })) || [];

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
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={projectionData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      stroke="#6b7280"
                      label={{
                        value: "Months",
                        position: "insideBottomRight",
                        offset: -5,
                      }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      label={{
                        value: "Portfolio Value ($)",
                        angle: -90,
                        position: "insideLeft",
                      }}
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
                    <ReferenceLine
                      y={fireNumber}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                      label={{
                        value: "FIRE Goal",
                        position: "right",
                        fill: "#f59e0b",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      name="Without Returns"
                    />
                    <Line
                      type="monotone"
                      dataKey="withReturns"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      name="With 7% Returns"
                    />
                  </LineChart>
                </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => {
                            const total = pieData.reduce(
                              (sum: number, item: any) => sum + item.value,
                              0,
                            );
                            const percentage = ((value / total) * 100).toFixed(
                              1,
                            );
                            return `${name}: ${percentage}%`;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((_: any, index: number) => (
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

                <Card className="col-span-1">
                  <CardBody>
                    <h3 className="text-lg font-semibold mb-4">
                      Allocation vs Target
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={barData}
                        margin={{ top: 5, right: 30, left: 0, bottom: 40 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#6b7280"
                          width={80}
                        />
                        <Tooltip
                          formatter={(value) => `${value}%`}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="Current"
                          fill="#2563eb"
                          radius={[0, 8, 8, 0]}
                        />
                        <Bar
                          dataKey="Target"
                          fill="#f59e0b"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
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
}
