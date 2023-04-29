import Image from "next/image";
import homePic from "../public/giphy.gif";

import { Inter } from "next/font/google";
import { Container } from "react-bootstrap";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <>
      <Container fluid className="text-center center">
        <Image src={homePic} alt="home"></Image>
      </Container>
    </>
  );
}
