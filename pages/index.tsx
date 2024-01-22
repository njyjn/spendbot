import Image from "next/image";
import homePic from "../public/images/giphy.gif";

import { Inter } from "next/font/google";
import { Container } from "react-bootstrap";
import { GetStaticPropsContext } from "next";

const inter = Inter({ subsets: ["latin"] });

export async function getStaticProps({ locale }: GetStaticPropsContext) {
  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}

export default function Home() {
  return (
    <Container fluid className="center text-center">
      <Image className="mx-auto" src={homePic} alt="home"></Image>
    </Container>
  );
}
