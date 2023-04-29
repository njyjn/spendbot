import { Inter } from "next/font/google";
import { Container } from "react-bootstrap";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import useSWR from "swr";
import moment from "moment";

const inter = Inter({ subsets: ["latin"] });

const fetcher = async (uri: string) => {
  const response = await fetch(uri);
  return response.json();
};

export default withPageAuthRequired(function Summary() {
  const month = moment().format("MMM YY");
  const { data, error } = useSWR(`/spend/api/expense?month=${month}`, fetcher);

  return (
    <>
      <Container fluid className="text-center center">
        <h1>📊 Сводка</h1>
        <p>в {month} года вы все потратили</p>
        <h2>{data ? data.total : "Загрузка..."}</h2>
      </Container>
    </>
  );
});
