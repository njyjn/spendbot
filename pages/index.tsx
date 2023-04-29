import Image from "next/image";
import homePic from "../public/giphy.gif";

import { Inter } from "next/font/google";
import { Container } from "react-bootstrap";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <Container fluid>
      <Image className="mx-auto" src={homePic} alt="home"></Image>
    </Container>
  );
}
