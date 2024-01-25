import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { GetStaticPropsContext } from "next";
import { useTranslations } from "next-intl";
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
import { Card, CardBody, Divider } from "@nextui-org/react";
import { Allocation, Goal } from "./api/networth";

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
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center pb-4">
          <h1 className={title()}>💰 {t("title")}</h1>
        </div>
        <div className="text-center justify-center">
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
                {data.total}
              </h1>
            </>
          ) : (
            <p>{t("loading")}</p>
          )}
        </div>
        <Divider />
        {!isLoading && data ? (
          <div className="max-w-[900px] gap-2 grid grid-cols-12 grid-rows-2">
            <Card className="col-span-6 sm:col-span-6">
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
                      labels: data.allocations.map(
                        (a: Allocation) => a.allocation,
                      ),
                      datasets: [
                        {
                          data: data.allocations.map(
                            (a: Allocation) => a.absolute,
                          ),
                          backgroundColor: data.allocations.map((_a: any) => {
                            return random_rgba();
                          }),
                        },
                      ],
                    }}
                  />
                </div>
              </CardBody>
            </Card>
            <Card className="col-span-6 sm:col-span-6">
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
                          backgroundColor: data.allocations.map((_a: any) => {
                            return random_rgba();
                          }),
                        },
                      ],
                    }}
                  />
                </div>
              </CardBody>
            </Card>
            <Card className="col-span-12 sm:col-span-12">
              <CardBody>
                <div style={{ display: "block", height: "40vh" }}>
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
                          data: data.goals.map((g: Goal) => g.percent * 100),
                          backgroundColor: data.goals.map((g: Goal) => {
                            if (g.percent >= 1) return "rgba(39,245,52,0.5)";
                            if (g.percent >= 0.5) return "rgba(245,232,39,0.5)";
                            if (g.percent >= 0) return "rgba(245,39,39,0.5)";
                          }),
                        },
                      ],
                    }}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        ) : (
          t("loading")
        )}
      </section>
    </DefaultLayout>
  );
});
